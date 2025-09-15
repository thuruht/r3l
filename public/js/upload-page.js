// File Upload Handler
document.addEventListener('DOMContentLoaded', () => {
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  const fileTypeIndicator = document.getElementById('file-type-indicator');
  const fileTypeSupport = document.getElementById('file-type-support');
  const uploadResult = document.getElementById('upload-result');
  const resultContent = document.getElementById('result-content');
  const copyLinkBtn = document.getElementById('copy-link');

  // File type validation
  const supportedFormats = {
    creative: ['image/', 'audio/', 'video/', 'application/pdf', 'application/zip'],
    technical: ['text/plain', 'application/json', 'text/csv', 'application/x-ipynb+json'],
    document: ['text/markdown', 'text/html', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  // File icon mapping
  const fileIcons = {
    'image/': 'image',
    'audio/': 'audiotrack',
    'video/': 'videocam',
    'application/pdf': 'picture_as_pdf',
    'application/zip': 'folder_zip',
    'text/plain': 'text_snippet',
    'application/json': 'data_object',
    'text/csv': 'table_chart',
    'application/x-ipynb+json': 'code',
    'text/markdown': 'article',
    'text/html': 'html',
    'application/msword': 'description',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'description',
    'default': 'insert_drive_file'
  };

  // Check if file type is supported
  function isFileSupported(fileType) {
    for (const category in supportedFormats) {
      for (const format of supportedFormats[category]) {
        if (fileType.startsWith(format)) {
          return { supported: true, category: category };
        }
      }
    }
    return { supported: false };
  }

  // Get icon for file type
  function getFileIcon(fileType) {
    for (const type in fileIcons) {
      if (fileType.startsWith(type)) {
        return fileIcons[type];
      }
    }
    return fileIcons.default;
  }

  // Format file size
  function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' bytes';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    else return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  // Update file type indicator
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const fileType = file.type || 'application/octet-stream';
      const fileSupport = isFileSupported(fileType);

      // Update icon
      fileTypeIndicator.textContent = getFileIcon(fileType);

      // Update support message
      if (fileSupport.supported) {
        fileTypeSupport.textContent = `${file.name} (${formatFileSize(file.size)}) - ${fileSupport.category} file`;
        fileTypeSupport.style.color = 'var(--success)';
      } else {
        fileTypeSupport.textContent = `Warning: ${fileType} may not be fully supported.`;
        fileTypeSupport.style.color = 'var(--warning)';
      }
    } else {
      fileTypeIndicator.textContent = 'help_outline';
      fileTypeSupport.textContent = '';
    }
  });

  // Handle form submission
  uploadForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const file = fileInput.files[0];
    if (!file) {
      alert('Please select a file to upload.');
      return;
    }

    const submitButton = uploadForm.querySelector('button[type="submit"]');
    const originalButtonHtml = submitButton.innerHTML;

    const setButtonState = (html, disabled) => {
      submitButton.innerHTML = html;
      submitButton.disabled = disabled;
    };

    try {
      // 1. Get a presigned URL from our API
      setButtonState('<span class="material-icons">hourglass_top</span> Preparing upload...', true);
      const presignResponse = await fetch('/api/files/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });

      if (!presignResponse.ok) {
        throw new Error('Could not get an upload URL. Please try again.');
      }

      const { url: presignedUrl, key: fileKey } = await presignResponse.json();

      // 2. Upload the file directly to R2 using the presigned URL
      setButtonState('<span class="material-icons">cloud_upload</span> Uploading...', true);
      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed. Please check your connection and try again.');
      }

      // 3. Register the uploaded file with our backend
      setButtonState('<span class="material-icons">sync</span> Registering file...', true);
      const descriptionInput = document.getElementById('description');
      const tagsInput = document.getElementById('tags');
      const visibilityInput = document.getElementById('visibility');

      const registerResponse = await fetch('/api/files/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          fileKey,
          fileName: file.name,
          contentType: file.type,
          title: file.name, // Using file name as title, could be a separate field
          description: descriptionInput.value,
          tags: tagsInput.value,
          isPublic: visibilityInput.checked,
        }),
      });

      if (!registerResponse.ok) {
        throw new Error('Could not register the file after upload.');
      }

      const result = await registerResponse.json();

      // 4. Display success message
      uploadForm.classList.add('hidden');
      uploadResult.classList.remove('hidden');

      const fileInfo = `
        <div class="flex items-center gap-2 mb-4">
          <span class="material-icons" style="font-size: 48px;">${getFileIcon(file.type)}</span>
          <div>
            <h4>${file.name}</h4>
            <p>${formatFileSize(file.size)} - ${file.type}</p>
          </div>
        </div>
        <div class="expiry-indicator">
          <span class="material-icons">timer</span>
          Expires on ${new Date(result.expiresAt).toLocaleDateString()}
        </div>
        <p class="mt-4">Your file is now in the Rel! You can view it in your drawer or share the link below:</p>
        <input type="text" class="mt-2" value="${window.location.origin}/content.html?id=${result.id}" readonly onclick="this.select()">
      `;
      resultContent.innerHTML = fileInfo;

      copyLinkBtn.addEventListener('click', () => {
        const linkInput = resultContent.querySelector('input');
        linkInput.select();
        document.execCommand('copy');
        copyLinkBtn.innerHTML = '<span class="material-icons">check</span> Copied!';
        setTimeout(() => {
          copyLinkBtn.innerHTML = '<span class="material-icons">content_copy</span> Copy Link';
        }, 2000);
      });

    } catch (error) {
      console.error('Upload process failed:', error);
      alert(`Upload failed: ${error.message}`);
      setButtonState(originalButtonHtml, false);
    }
  });
});
