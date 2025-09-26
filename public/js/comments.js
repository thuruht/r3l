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
      const comments = await window.r3l.apiGet(window.r3l.API_ENDPOINTS.CONTENT.COMMENTS.GET(this.contentId));
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

    if (window.r3l.isAuthenticated()) {
        this.addCommentForm();
    } else {
        this.commentsContainer.insertAdjacentHTML('beforeend', '<p>You must be <a href="/login.html">logged in</a> to comment.</p>');
    }
  }

  renderComment(comment) {
    return `
      <div class="comment" data-comment-id="${comment.id}">
        <div class="comment-header">
          <img src="/icons/avatar.svg" alt="avatar" width="24" height="24" style="border-radius:50%">
          <strong>${escapeHtml(comment.display_name || comment.username)}</strong>
          <span class="text-muted">${new Date(comment.created_at).toLocaleString()}</span>
        </div>
        <div class="comment-body">
          <p>${escapeHtml(comment.comment)}</p>
        </div>
      </div>
    `;
  }

  addCommentForm() {
    const formHtml = `
      <form id="comment-form-root" class="comment-form">
        <textarea name="comment" placeholder="Add a comment..." required></textarea>
        <button type="submit" class="btn">Submit</button>
      </form>
    `;

    // Remove existing form before adding a new one
    const existingForm = this.commentsContainer.querySelector('#comment-form-root');
    if (existingForm) {
        existingForm.remove();
    }

    this.commentsContainer.insertAdjacentHTML('beforeend', formHtml);
    document.getElementById('comment-form-root').addEventListener('submit', (e) => this.handleCommentSubmit(e));
  }

  async handleCommentSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const textarea = form.querySelector('textarea');
    const comment = textarea.value.trim();

    if (comment) {
      try {
        await window.r3l.apiPost(window.r3l.API_ENDPOINTS.CONTENT.COMMENTS.CREATE(this.contentId), {
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