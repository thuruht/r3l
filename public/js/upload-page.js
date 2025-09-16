document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const filePreviewContainer = document.getElementById('file-preview-container');
    const uploadBtn = document.getElementById('upload-btn');
    const clearBtn = document.getElementById('clear-btn');
    const uploadResult = document.getElementById('upload-result');
    const resultContent = document.getElementById('result-content');
    const copyLinkBtn = document.getElementById('copy-link');

    let filesToUpload = [];

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

    function getFileIcon(fileType) {
        for (const type in fileIcons) {
            if (fileType.startsWith(type)) {
                return fileIcons[type];
            }
        }
        return fileIcons.default;
    }

    function formatFileSize(bytes) {
        if (bytes < 1024) return bytes + ' bytes';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
        return (bytes / 1073741824).toFixed(1) + ' GB';
    }

    function handleFiles(files) {
        for (const file of files) {
            if (!filesToUpload.some(f => f.name === file.name && f.size === file.size)) {
                filesToUpload.push(file);
            }
        }
        renderPreviews();
        updateUploadButtonState();
    }

    function renderPreviews() {
        filePreviewContainer.innerHTML = '';
        filesToUpload.forEach((file, index) => {
            const previewElement = document.createElement('div');
            previewElement.className = 'file-preview';
            previewElement.innerHTML = `
                <div class="file-preview-thumbnail">
                    ${file.type.startsWith('image/') ? `<img src="${URL.createObjectURL(file)}" alt="${file.name}">` : `<span class="material-icons">${getFileIcon(file.type)}</span>`}
                </div>
                <div class="file-preview-info">
                    <span class="file-preview-name">${file.name}</span>
                    <span class="file-preview-size">${formatFileSize(file.size)}</span>
                </div>
                <button class="file-preview-remove" data-index="${index}" aria-label="Remove file">
                    <span class="material-icons">close</span>
                </button>
                <div class="file-preview-progress-container">
                    <div class="file-preview-progress" id="progress-${index}"></div>
                </div>
            `;
            filePreviewContainer.appendChild(previewElement);
        });
    }

    function updateUploadButtonState() {
        uploadBtn.disabled = filesToUpload.length === 0;
    }

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => handleFiles(fileInput.files));

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
    });

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.add('drag-over'));
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
    });

    dropZone.addEventListener('drop', (e) => {
        handleFiles(e.dataTransfer.files);
    });

    filePreviewContainer.addEventListener('click', (e) => {
        if (e.target.closest('.file-preview-remove')) {
            const index = parseInt(e.target.closest('.file-preview-remove').dataset.index, 10);
            filesToUpload.splice(index, 1);
            renderPreviews();
            updateUploadButtonState();
        }
    });

    clearBtn.addEventListener('click', () => {
        filesToUpload = [];
        renderPreviews();
        updateUploadButtonState();
    });

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (filesToUpload.length === 0) return;

        uploadBtn.disabled = true;
        uploadBtn.innerHTML = `<span class="material-icons" aria-hidden="true">hourglass_top</span> Uploading...`;

        const description = document.getElementById('description').value;
        const tags = document.getElementById('tags').value;
        const isPublic = document.getElementById('visibility').checked;

        const uploadPromises = filesToUpload.map((file, index) =>
            uploadFile(file, index, { description, tags, isPublic })
        );

        const results = await Promise.all(uploadPromises);

        uploadForm.classList.add('hidden');
        uploadResult.classList.remove('hidden');

        const successfulUploads = results.filter(r => r.success);
        const failedUploads = results.filter(r => !r.success);

        let resultHTML = '';
        if (successfulUploads.length > 0) {
            resultHTML += `<h3>${successfulUploads.length} file(s) uploaded successfully:</h3>`;
            resultHTML += '<ul>';
            successfulUploads.forEach(result => {
                resultHTML += `<li><a href="/content.html?id=${result.id}" target="_blank">${result.fileName}</a></li>`;
            });
            resultHTML += '</ul>';
        }

        if (failedUploads.length > 0) {
            resultHTML += `<h3 class="mt-4">The following ${failedUploads.length} file(s) failed to upload:</h3>`;
            resultHTML += '<ul>';
            failedUploads.forEach(result => {
                resultHTML += `<li>${result.fileName} (${result.error})</li>`;
            });
            resultHTML += '</ul>';
        }

        resultContent.innerHTML = resultHTML;

        // Since there are multiple links, the "Copy Link" button is less useful.
        // Let's change it to a "Upload More" button.
        copyLinkBtn.innerHTML = '<span class="material-icons" aria-hidden="true">add</span> Upload More Files';
        copyLinkBtn.onclick = () => window.location.reload();
    });

    async function uploadFile(file, index, metadata) {
        const progressEl = document.getElementById(`progress-${index}`);
        try {
            // 1. Get presigned URL
            progressEl.style.width = '20%';
            const presignResponse = await fetch('/api/files/upload-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ fileName: file.name, contentType: file.type }),
            });
            if (!presignResponse.ok) throw new Error('Could not get upload URL.');
            const { url: presignedUrl, key: fileKey } = await presignResponse.json();

            // 2. Upload to R2
            progressEl.style.width = '60%';
            const uploadResponse = await fetch(presignedUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type },
            });
            if (!uploadResponse.ok) throw new Error('File upload failed.');

            // 3. Register file
            progressEl.style.width = '80%';
            const registerResponse = await fetch('/api/files/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    fileKey,
                    fileName: file.name,
                    contentType: file.type,
                    title: file.name,
                    description: metadata.description,
                    tags: metadata.tags,
                    isPublic: metadata.isPublic,
                }),
            });
            if (!registerResponse.ok) throw new Error('Could not register file.');
            const result = await registerResponse.json();

            progressEl.style.backgroundColor = 'var(--success)';
            progressEl.style.width = '100%';

            return { success: true, id: result.id, fileName: file.name };

        } catch (error) {
            console.error(`Failed to upload ${file.name}:`, error);
            progressEl.style.backgroundColor = 'var(--error)';
            progressEl.style.width = '100%';
            return { success: false, fileName: file.name, error: error.message };
        }
    }
});
