import { Env } from '../types/env';
import { ContentHandler } from './content';

interface AuthenticatedRequest extends Request {
  userId: string;
  userRole: string;
  authenticated: boolean;
}

interface CopyRequest {
  contentId: string;
  isPublic?: boolean;
  makeVote?: boolean;
}

export class ContentCopyHandler {
  /**
   * Handle copying content to user's storage
   */
  async handleCopyContent(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      // Only authenticated users can copy content
      if (!request.authenticated || !request.userId) {
        return new Response('Authentication required', { status: 401 });
      }

      // Parse the request JSON
      const data = (await request.json()) as CopyRequest;
      const { contentId, isPublic = false, makeVote = true } = data;

      if (!contentId) {
        return new Response('Content ID is required', { status: 400 });
      }

      // Copy the content to the user's storage
      const contentHandler = new ContentHandler();
      const copyId = await contentHandler.copyToDrawer(contentId, request.userId, isPublic, env);

      // Record the copy as an archive vote if requested
      if (makeVote) {
        await this.recordArchiveVote(contentId, request.userId, 'copy', env);
      }

      return new Response(
        JSON.stringify({
          success: true,
          copyId,
          message: 'Content copied to your storage',
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      console.error('Copy content error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Handle downloading content and counting it as an archive vote
   */
  async handleDownloadContent(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      const url = new URL(request.url);
      const contentId = url.pathname.split('/').pop();

      if (!contentId) {
        return new Response('Content ID is required', { status: 400 });
      }

      // Get the content
      const contentHandler = new ContentHandler();
      const content = await contentHandler.getContent(contentId, env);

      if (!content) {
        return new Response('Content not found', { status: 404 });
      }

      // Check access permission
      if (
        !(await contentHandler.canAccessContent(
          contentId,
          request.authenticated ? request.userId : null,
          env
        ))
      ) {
        return new Response('Access denied', { status: 403 });
      }

      // Record the download as an archive vote if user is authenticated
      if (request.authenticated && request.userId) {
        await this.recordArchiveVote(contentId, request.userId, 'download', env);
      }

      // Get the file from R2
      const file = await env.R3L_CONTENT_BUCKET.get(content.file_key || contentId);

      if (!file) {
        return new Response('File not found', { status: 404 });
      }

      // Return the file as a download
      return new Response(file.body, {
        headers: {
          'Content-Type': content.type || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${content.title}"`,
          'Cache-Control': 'private, max-age=3600',
        },
      });
    } catch (error: any) {
      console.error('Download content error:', error);
      return new Response(`Download failed: ${error?.message || 'Unknown error'}`, {
        status: 500,
      });
    }
  }

  /**
   * Handle explicit voting for archiving content
   */
  async handleExplicitVote(request: AuthenticatedRequest, env: Env): Promise<Response> {
    try {
      // Only authenticated users can vote
      if (!request.authenticated || !request.userId) {
        return new Response('Authentication required', { status: 401 });
      }

      // Parse the request
      const data = (await request.json()) as { contentId: string };
      const { contentId } = data;

      if (!contentId) {
        return new Response('Content ID is required', { status: 400 });
      }

      // Check if user has available votes
      const userVotes = await this.getUserDailyVotes(request.userId, env);

      if (userVotes.votesAvailable <= 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'No votes available today',
            nextReset: userVotes.nextResetDate,
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Record the vote
      const voteResult = await this.recordArchiveVote(contentId, request.userId, 'explicit', env);

      // Decrement available votes
      await this.useVote(request.userId, env);

      // Get updated vote counts
      const updatedUserVotes = await this.getUserDailyVotes(request.userId, env);

      return new Response(
        JSON.stringify({
          success: true,
          contentId,
          currentVotes: voteResult.currentVotes,
          threshold: voteResult.threshold,
          votesRemaining: updatedUserVotes.votesAvailable,
          nextReset: updatedUserVotes.nextResetDate,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      console.error('Explicit vote error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error?.message || 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /**
   * Record an archive vote and check if content should be community archived
   */
  private async recordArchiveVote(
    contentId: string,
    userId: string,
    voteType: 'copy' | 'download' | 'explicit',
    env: Env
  ): Promise<{ currentVotes: number; threshold: number; archived: boolean }> {
    // Check if already voted
    const existingVote = await env.R3L_DB.prepare(
      `
      SELECT id FROM content_archive_votes
      WHERE content_id = ? AND user_id = ?
    `
    )
      .bind(contentId, userId)
      .first();

    // If already voted and it's not an explicit vote, just return current votes
    if (existingVote && voteType !== 'explicit') {
      const currentVotes = await env.R3L_DB.prepare(
        `
        SELECT archive_votes FROM content
        WHERE id = ?
      `
      )
        .bind(contentId)
        .first<{ archive_votes: number }>();

      // Get current threshold
      const thresholdResult = await env.R3L_DB.prepare(
        `
        SELECT COUNT(*) * 0.05 as threshold FROM content
        WHERE archive_status = 'active'
      `
      ).first<{ threshold: number }>();

      const threshold = Math.max(5, Math.ceil(thresholdResult?.threshold || 5));

      return {
        currentVotes: currentVotes?.archive_votes || 0,
        threshold,
        archived: false,
      };
    }

    // Add vote
    await env.R3L_DB.prepare(
      `
      INSERT INTO content_archive_votes (id, content_id, user_id, vote_type, created_at)
      VALUES (?, ?, ?, ?, ?)
    `
    )
      .bind(crypto.randomUUID(), contentId, userId, voteType, Date.now())
      .run();

    // Update vote count in content table
    await env.R3L_DB.prepare(
      `
      UPDATE content
      SET archive_votes = archive_votes + 1
      WHERE id = ?
    `
    )
      .bind(contentId)
      .run();

    // Get updated vote count
    const updatedVotes = await env.R3L_DB.prepare(
      `
      SELECT archive_votes, archive_status FROM content
      WHERE id = ?
    `
    )
      .bind(contentId)
      .first<{
        archive_votes: number;
        archive_status: string;
      }>();

    // Get current threshold
    const thresholdResult = await env.R3L_DB.prepare(
      `
      SELECT COUNT(*) * 0.05 as threshold FROM content
      WHERE archive_status = 'active'
    `
    ).first<{ threshold: number }>();

    const threshold = Math.max(5, Math.ceil(thresholdResult?.threshold || 5));
    let archived = false;

    // If vote count reaches threshold and content is active, mark as community archived
    if (
      updatedVotes &&
      updatedVotes.archive_votes >= threshold &&
      updatedVotes.archive_status === 'active'
    ) {
      // Update content status
      await env.R3L_DB.prepare(
        `
        UPDATE content
        SET archive_status = 'community'
        WHERE id = ?
      `
      )
        .bind(contentId)
        .run();

      // Update lifecycle record
      await env.R3L_DB.prepare(
        `
        UPDATE content_lifecycle
        SET archived_at = ?,
            archive_type = 'community',
            expires_at = NULL
        WHERE content_id = ?
      `
      )
        .bind(Date.now(), contentId)
        .run();

      archived = true;
    }

    return {
      currentVotes: updatedVotes?.archive_votes || 0,
      threshold,
      archived,
    };
  }

  /**
   * Get user's daily votes
   */
  private async getUserDailyVotes(
    userId: string,
    env: Env
  ): Promise<{
    votesAvailable: number;
    votesUsed: number;
    nextResetDate: string;
  }> {
    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Get user's daily votes
    const userVotes = await env.R3L_DB.prepare(
      `
      SELECT votes_used, votes_available, last_reset_date 
      FROM user_daily_votes
      WHERE user_id = ?
    `
    )
      .bind(userId)
      .first<{
        votes_used: number;
        votes_available: number;
        last_reset_date: string;
      }>();

    // If no record or last reset was not today, create/update with fresh votes
    if (!userVotes || userVotes.last_reset_date !== today) {
      // Calculate next reset date (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      if (!userVotes) {
        // Create new record
        await env.R3L_DB.prepare(
          `
          INSERT INTO user_daily_votes (id, user_id, votes_used, votes_available, last_reset_date)
          VALUES (?, ?, 0, 1, ?)
        `
        )
          .bind(crypto.randomUUID(), userId, today)
          .run();
      } else {
        // Reset existing record
        await env.R3L_DB.prepare(
          `
          UPDATE user_daily_votes
          SET votes_used = 0, votes_available = 1, last_reset_date = ?
          WHERE user_id = ?
        `
        )
          .bind(today, userId)
          .run();
      }

      return {
        votesAvailable: 1,
        votesUsed: 0,
        nextResetDate: tomorrow.toISOString(),
      };
    }

    // Calculate next reset date (tomorrow)
    const nextReset = new Date();
    nextReset.setDate(nextReset.getDate() + 1);
    nextReset.setHours(0, 0, 0, 0);

    return {
      votesAvailable: userVotes.votes_available,
      votesUsed: userVotes.votes_used,
      nextResetDate: nextReset.toISOString(),
    };
  }

  /**
   * Use a daily vote
   */
  private async useVote(userId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(
      `
      UPDATE user_daily_votes
      SET votes_used = votes_used + 1, votes_available = votes_available - 1
      WHERE user_id = ?
    `
    )
      .bind(userId)
      .run();
  }
}
