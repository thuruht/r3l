import { Env } from '../types/env';

interface AssociationItem {
  id: string;
  content_id: string;
  target_id: string;
  type: string;
  created_at: number;
  weight: number;
}

interface ContentIdResult {
  id: string;
}

export class AssociationHandler {
  /**
   * Creates a new association between two content items
   * @param contentId Source content ID
   * @param targetId Target content ID
   * @param type Type of association (e.g., 'reference', 'remix', 'response')
   * @param weight Strength of association (0-100)
   * @param env Environment bindings
   */
  async createAssociation(
    contentId: string,
    targetId: string,
    type: string,
    weight: number,
    env: Env
  ): Promise<void> {
    // Validate the content IDs exist
    const sourceExists = await this.contentExists(contentId, env);
    const targetExists = await this.contentExists(targetId, env);

    if (!sourceExists || !targetExists) {
      throw new Error('One or both content items do not exist');
    }

    // Normalize weight to 0-100 range
    const normalizedWeight = Math.max(0, Math.min(100, weight));

    // Create the association
    await env.R3L_DB.prepare(
      `
      INSERT INTO content_associations (id, content_id, target_id, type, created_at, weight)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(crypto.randomUUID(), contentId, targetId, type, Date.now(), normalizedWeight)
      .run();
  }

  /**
   * Retrieve all associations for a content item
   * @param contentId Content ID to get associations for
   * @param env Environment bindings
   * @returns Array of association objects
   */
  async getAssociations(contentId: string, env: Env): Promise<AssociationItem[]> {
    // Get all associations where this content is either the source or target
    const result = await env.R3L_DB.prepare(
      `
      SELECT * FROM content_associations
      WHERE content_id = ? OR target_id = ?
      ORDER BY weight DESC
    `
    )
      .bind(contentId, contentId)
      .all<AssociationItem>();

    return result.results || [];
  }

  /**
   * Get association graph data for visualization
   * @param contentId Starting content ID
   * @param depth How many levels of associations to retrieve (1-3)
   * @param env Environment bindings
   * @returns Graph data for D3.js visualization
   */
  async getAssociationGraph(
    contentId: string,
    depth: number = 2,
    env: Env
  ): Promise<{ nodes: any[]; links: any[] }> {
    // Limit depth to reasonable values
    const maxDepth = Math.max(1, Math.min(3, depth));

    // Set to track processed content IDs
    const processedIds = new Set<string>();
    // Results for D3.js format
    const nodes: any[] = [];
    const links: any[] = [];

    // Process associations recursively
    await this.processAssociationLevel(contentId, maxDepth, processedIds, nodes, links, env);

    return { nodes, links };
  }

  /**
   * Helper to recursively process association levels
   */
  private async processAssociationLevel(
    contentId: string,
    remainingDepth: number,
    processedIds: Set<string>,
    nodes: any[],
    links: any[],
    env: Env
  ): Promise<void> {
    // Stop if we've already processed this node or reached max depth
    if (processedIds.has(contentId) || remainingDepth <= 0) {
      return;
    }

    // Mark as processed
    processedIds.add(contentId);

    // Get content details for the node
    const content = await this.getContentDetails(contentId, env);
    if (content) {
      // Add node
      nodes.push({
        id: contentId,
        title: content.title,
        type: content.type,
        category: content.category,
      });

      // Get all associations
      const associations = await this.getAssociations(contentId, env);

      for (const assoc of associations) {
        // For each association, add a link
        const sourceId = assoc.content_id;
        const targetId = assoc.target_id;

        // Add the link
        links.push({
          source: sourceId,
          target: targetId,
          type: assoc.type,
          weight: assoc.weight,
        });

        // Process the other end of the association if not already processed
        const nextId = sourceId === contentId ? targetId : sourceId;
        if (!processedIds.has(nextId) && remainingDepth > 1) {
          await this.processAssociationLevel(
            nextId,
            remainingDepth - 1,
            processedIds,
            nodes,
            links,
            env
          );
        }
      }
    }
  }

  /**
   * Delete an association
   * @param associationId ID of the association to delete
   * @param env Environment bindings
   */
  async deleteAssociation(associationId: string, env: Env): Promise<void> {
    await env.R3L_DB.prepare(
      `
      DELETE FROM content_associations
      WHERE id = ?
    `
    )
      .bind(associationId)
      .run();
  }

  /**
   * Update an association's properties
   * @param associationId ID of the association to update
   * @param type New association type
   * @param weight New association weight (0-100)
   * @param env Environment bindings
   */
  async updateAssociation(
    associationId: string,
    type: string,
    weight: number,
    env: Env
  ): Promise<void> {
    // Normalize weight
    const normalizedWeight = Math.max(0, Math.min(100, weight));

    await env.R3L_DB.prepare(
      `
      UPDATE content_associations
      SET type = ?, weight = ?
      WHERE id = ?
    `
    )
      .bind(type, normalizedWeight, associationId)
      .run();
  }

  /**
   * Helper to check if content exists
   */
  private async contentExists(contentId: string, env: Env): Promise<boolean> {
    const result = await env.R3L_DB.prepare(
      `
      SELECT id FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .first<ContentIdResult>();

    return !!result;
  }

  /**
   * Helper to get content details
   */
  private async getContentDetails(contentId: string, env: Env): Promise<any> {
    const result = await env.R3L_DB.prepare(
      `
      SELECT id, title, type, category FROM content WHERE id = ?
    `
    )
      .bind(contentId)
      .first();

    return result;
  }
}
