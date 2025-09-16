import { apiGet, apiPost, API_ENDPOINTS } from './utils/api-helper.js';
import { escapeHtml } from './utils/ui-helpers.js';

class Comments {
  constructor(contentId, commentsSection) {
    this.contentId = contentId;
    this.commentsSection = commentsSection;
    this.commentsContainer = commentsSection.querySelector('.card-body');
  }

  static init(contentId) {
    const commentsSection = document.getElementById('comments-section');
    if (commentsSection) {
      const comments = new Comments(contentId, commentsSection);
      comments.loadComments();
      return comments;
    }
    return null;
  }

  async loadComments() {
    this.commentsContainer.innerHTML = '<p>Loading comments...</p>';
    try {
      const comments = await apiGet(API_ENDPOINTS.CONTENT.COMMENTS.GET(this.contentId));
      this.renderComments(comments);
    } catch (error) {
      this.commentsContainer.innerHTML = '<p class="text-error">Failed to load comments.</p>';
      console.error('Error loading comments:', error);
    }
  }

  renderComments(comments) {
    if (!comments || comments.length === 0) {
      this.commentsContainer.innerHTML = '<p>No comments yet.</p>';
    } else {
      const commentsHtml = comments.map(comment => this.renderComment(comment)).join('');
      this.commentsContainer.innerHTML = commentsHtml;
    }
    this.addCommentForm();
  }

  renderComment(comment) {
    const repliesHtml = comment.replies && comment.replies.length > 0
      ? `<div class="comment-replies">${comment.replies.map(reply => this.renderComment(reply)).join('')}</div>`
      : '';

    return `
      <div class="comment" data-comment-id="${comment.id}">
        <div class="comment-header">
          <img src="${comment.avatar_url || '/icons/avatar.svg'}" alt="avatar" width="24" height="24" style="border-radius:50%">
          <strong>${escapeHtml(comment.display_name || comment.username)}</strong>
          <span class="text-muted">${new Date(comment.created_at).toLocaleString()}</span>
        </div>
        <div class="comment-body">
          <p>${escapeHtml(comment.comment)}</p>
        </div>
        <div class="comment-footer">
          <button class="btn-link" onclick="window.comments.showReplyForm('${comment.id}')">Reply</button>
        </div>
        ${repliesHtml}
      </div>
    `;
  }

  addCommentForm(parentCommentId = null) {
    const formHtml = `
      <form id="comment-form-${parentCommentId || 'root'}" class="comment-form">
        <textarea name="comment" placeholder="Add a comment..." required></textarea>
        <button type="submit" class="btn">Submit</button>
      </form>
    `;
    if (parentCommentId) {
      const parentComment = this.commentsContainer.querySelector(`.comment[data-comment-id="${parentCommentId}"]`);
      if (parentComment) {
        // Remove any existing reply forms
        const existingForm = parentComment.querySelector('.comment-form');
        if (existingForm) {
            existingForm.remove();
        }
        parentComment.insertAdjacentHTML('beforeend', formHtml);
        const form = document.getElementById(`comment-form-${parentCommentId}`);
        form.addEventListener('submit', (e) => this.handleCommentSubmit(e, parentCommentId));
        form.querySelector('textarea').focus();
      }
    } else {
      this.commentsContainer.insertAdjacentHTML('beforeend', formHtml);
      document.getElementById('comment-form-root').addEventListener('submit', (e) => this.handleCommentSubmit(e, null));
    }
  }

  showReplyForm(parentCommentId) {
    this.addCommentForm(parentCommentId);
  }

  async handleCommentSubmit(event, parentCommentId) {
    event.preventDefault();
    const form = event.target;
    const textarea = form.querySelector('textarea');
    const comment = textarea.value.trim();

    if (comment) {
      try {
        await apiPost(API_ENDPOINTS.CONTENT.COMMENTS.CREATE(this.contentId), {
          parentCommentId,
          comment,
        });
        textarea.value = '';
        this.loadComments(); // Reload all comments to show the new one
      } catch (error) {
        console.error('Error submitting comment:', error);
        alert('Failed to submit comment.');
      }
    }
  }
}

window.Comments = Comments;
