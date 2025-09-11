import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState } from './utils/ui-helpers.js';

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the navigation bar
  NavigationBar.init('profile');

  const loadingEl = document.getElementById('loading');
  const notAuthenticatedEl = document.getElementById('not-authenticated');
  const profileDataEl = document.getElementById('profile-data');

  const profileNameEl = document.getElementById('profile-name');
  const profileUsernameEl = document.getElementById('profile-username');
  const profileJoinedEl = document.getElementById('profile-joined');
  const profileAvatarEl = document.getElementById('profile-avatar');

  const statContributionsEl = document.getElementById('stat-contributions');
  const statDrawersEl = document.getElementById('stat-drawers');
  const statConnectionsEl = document.getElementById('stat-connections');
  const statsListEl = document.querySelector('.profile-stats');

  const authProvidersEl = document.getElementById('auth-providers');
  const editProfileBtn = document.getElementById('edit-profile-btn');
  const generateRecoveryKeyBtn = document.getElementById('generate-recovery-key-btn');
  const logoutBtn = document.getElementById('logout-btn');

  // Privacy settings elements
  const lurkerModeToggle = document.getElementById('lurker-mode-toggle');
  const lurkerRandomness = document.getElementById('lurker-randomness');
  const lurkerRandomnessValue = document.getElementById('lurker-randomness-value');
  const locationVisibilityToggle = document.getElementById('location-visibility-toggle');
  const defaultVisibilityRadios = document.getElementsByName('default-visibility');
  const savePrivacySettingsBtn = document.getElementById('save-privacy-settings');

  // Recovery key modal elements
  const recoveryKeyModal = document.getElementById('recovery-key-modal');
  const recoveryKeyDisplay = document.getElementById('recovery-key-display');
  const copyRecoveryKeyBtn = document.getElementById('copy-recovery-key-btn');
  const closeModalBtn = document.getElementById('close-modal-btn');

  // Update lurker randomness value display when slider changes
  lurkerRandomness.addEventListener('input', () => {
    lurkerRandomnessValue.textContent = `${lurkerRandomness.value}%`;
  });

  // Save privacy settings
  savePrivacySettingsBtn.addEventListener('click', async () => {
    try {
      // Get user ID from the URL or data attribute
      const userId = savePrivacySettingsBtn.getAttribute('data-user-id');
      if (!userId) {
        throw new Error('User ID not found');
      }

      // Get selected visibility option
      let defaultContentVisibility = 'public';
      for (const radio of defaultVisibilityRadios) {
        if (radio.checked) {
          defaultContentVisibility = radio.value;
          break;
        }
      }

      // Create preferences object
      const preferences = {
        lurkerModeEnabled: lurkerModeToggle.checked,
        lurkerModeRandomness: parseInt(lurkerRandomness.value),
        showLocationByDefault: locationVisibilityToggle.checked,
        defaultContentVisibility
      };

      console.log('Saving preferences:', preferences);

      // Save preferences
      const response = await fetch(`/api/users/${userId}/preferences`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });

      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.status} ${response.statusText}`);
      }

      // Show success message
      alert('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      alert('Failed to save preferences. Please try again.');
    }
  });

  // Function to populate user preferences
  function populateUserPreferences(user) {
    // Set user ID as data attribute for save button
    savePrivacySettingsBtn.setAttribute('data-user-id', user.id);

    // Check if user has preferences
    if (user.preferences) {
      // Set lurker mode toggle
      lurkerModeToggle.checked = !!user.preferences.lurkerModeEnabled;

      // Set lurker randomness slider
      const randomness = user.preferences.lurkerModeRandomness || 50;
      lurkerRandomness.value = randomness;
      lurkerRandomnessValue.textContent = `${randomness}%`;

      // Set location visibility toggle
      locationVisibilityToggle.checked = !!user.preferences.showLocationByDefault;

      // Set default content visibility
      const visibility = user.preferences.defaultContentVisibility || 'public';
      for (const radio of defaultVisibilityRadios) {
        if (radio.value === visibility) {
          radio.checked = true;
          break;
        }
      }
    }
  }

  // Check for new registration notification
  const urlParams = new URLSearchParams(window.location.search);
  const isNewRegistration = urlParams.get('new') === 'true';

  if (isNewRegistration) {
    // Could add a welcome message here
    console.log('New registration detected');
  }

  // Function to check if user is authenticated and load profile data
  const loadProfileData = async () => {
    try {
      // Make request to get user profile using JWT auth
      console.log('Fetching user profile data from /api/auth/jwt/profile');
      const response = await fetch('/api/auth/jwt/profile', {
        credentials: 'include' // Important to send cookies!
      });

      console.log('Profile response:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Profile fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Profile data:', data);

      if (!data || !data.username) {
        throw new Error('Invalid user data received');
      }

      // User is authenticated, populate profile data
      const user = data;

      // Set basic profile info
      profileNameEl.textContent = user.displayName || 'R3L User';
      profileUsernameEl.textContent = `@${user.username}`;

      // Format joined date
      if (user.createdAt) {
        const joinedDate = new Date(user.createdAt);
        profileJoinedEl.textContent = `Joined on ${joinedDate.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}`;
      } else {
        profileJoinedEl.textContent = 'Join date unknown';
      }

      // Set avatar if available
      if (user.avatarUrl) {
        profileAvatarEl.src = user.avatarUrl;
        profileAvatarEl.alt = `${user.displayName || user.username}'s avatar`;
        profileAvatarEl.style.display = 'block';
      } else if (user.avatar_key) {
        profileAvatarEl.src = `/api/files/${user.avatar_key}`;
        profileAvatarEl.alt = `${user.displayName || user.username}'s avatar`;
        profileAvatarEl.style.display = 'block';
      } else {
        // Show initial in a fallback div
        profileAvatarEl.style.display = 'none';
        let initialDiv = document.getElementById('profile-avatar-container').querySelector('.avatar-initial');
        if (!initialDiv) {
          initialDiv = document.createElement('div');
          initialDiv.className = 'avatar-initial profile-avatar';
          document.getElementById('profile-avatar-container').appendChild(initialDiv);
        }
        const initial = (user.displayName || user.username || '?').charAt(0).toUpperCase();
        initialDiv.textContent = initial;
        initialDiv.style.display = 'flex';
      }

      // Show authentication providers
      authProvidersEl.innerHTML = '';

      // If using JWT auth, show that
      const jwtProvider = document.createElement('div');
      jwtProvider.className = 'auth-provider';
      jwtProvider.innerHTML = `
        <span class="material-icons">key</span>
        <span>Password</span>
      `;
      authProvidersEl.appendChild(jwtProvider);

      // Add recovery key information
      const recoveryKeyInfo = document.createElement('div');
      recoveryKeyInfo.className = 'auth-provider';
      recoveryKeyInfo.innerHTML = `
        <span class="material-icons">security</span>
        <span>Recovery Key</span>
      `;
      authProvidersEl.appendChild(recoveryKeyInfo);

      // Try to load user stats if available
      try {
        console.log(`Fetching stats for user ${user.id}`);
        const statsResponse = await fetch(`/api/users/${user.id}/stats`, {
          credentials: 'include'
        });

        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          statContributionsEl.textContent = stats.contributions || 0;
          statDrawersEl.textContent = stats.drawers || 0;
          statConnectionsEl.textContent = stats.connections || 0;
        } else {
          const refCode = generateRefCode('STATS-LOAD-ERR');
          console.error(`Stats fetch failed with status: ${statsResponse.status}. Ref: ${refCode}`);
          displayEmptyState(statsListEl, 'Could not load stats.', refCode);
        }
      } catch (statsError) {
        const refCode = generateRefCode('STATS-LOAD-ERR');
        console.error('Could not load stats:', statsError, `Ref: ${refCode}`);
        displayEmptyState(statsListEl, 'Could not load stats.', refCode);
      }

      // Load user's map points
      try {
        console.log(`Fetching map points for user ${user.id}`);

        // Set up avatar upload
        const avatarUploadOverlay = document.getElementById('avatar-upload-overlay');
        const avatarUploadInput = document.getElementById('avatar-upload');

        // Show overlay when hovering over avatar
        avatarUploadOverlay.classList.remove('hidden');

        // Handle avatar file selection
        avatarUploadInput.addEventListener('change', async (event) => {
          const file = event.target.files[0];
          if (!file) return;

          // Validate file type
          if (!file.type.startsWith('image/')) {
            alert('Please select an image file (PNG, JPG, GIF, etc.)');
            return;
          }

          // Show loading state
          profileAvatarEl.src = '/icons/loading-spinner.svg';

          try {
            // Create form data
            const formData = new FormData();
            formData.append('file', file);

            // Upload avatar
            const response = await fetch('/api/files/avatar', {
              method: 'POST',
              credentials: 'include',
              body: formData
            });

            if (!response.ok) {
              throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.avatarUrl) {
              // Update avatar with the new URL
              profileAvatarEl.src = result.avatarUrl;
              // Reset any custom styling
              profileAvatarEl.style = '';
              profileAvatarEl.innerHTML = '';
            } else {
              throw new Error('Invalid response from server');
            }
          } catch (error) {
            console.error('Avatar upload error:', error);
            alert('Failed to upload avatar. Please try again.');
            // Reset to previous avatar or default
            if (user.avatarUrl) {
              profileAvatarEl.src = user.avatarUrl;
              profileAvatarEl.style = '';
              profileAvatarEl.innerHTML = '';
            } else if (user.avatar_key) {
              profileAvatarEl.src = `/api/files/${user.avatar_key}`;
              profileAvatarEl.style = '';
              profileAvatarEl.innerHTML = '';
            } else {
              profileAvatarEl.src = '/icons/user-default.svg';
              profileAvatarEl.style = '';
              profileAvatarEl.innerHTML = '';
            }
          }
        });

        const mapPointsResponse = await fetch(`/api/globe/data-points?userId=${user.id}`, {
          credentials: 'include'
        });

        console.log('Map points response:', mapPointsResponse.status, mapPointsResponse.statusText);

        if (mapPointsResponse.ok) {
          const mapPoints = await mapPointsResponse.json();
          console.log('Map points data:', mapPoints);

          const mapPointsContainer = document.getElementById('user-map-points');
          const emptyState = document.querySelector('.empty-state');

          if (mapPoints && mapPoints.length > 0) {
            // Hide empty state if we have points
            emptyState.classList.add('hidden');

            // Populate the map points grid
            mapPointsContainer.innerHTML = '';

            mapPoints.forEach(point => {
              const pointCard = document.createElement('div');
              pointCard.className = 'map-point-card';

              // Format coordinates to 4 decimal places
              const latitude = parseFloat(point.latitude).toFixed(4);
              const longitude = parseFloat(point.longitude).toFixed(4);

              pointCard.innerHTML = `
                <h4 class="map-point-title">${point.title}</h4>
                <p class="map-point-coords">${latitude}, ${longitude}</p>
                ${point.description ? `<p class="map-point-desc">${point.description}</p>` : ''}
                <div class="map-point-actions">
                  <button class="view-on-map" data-id="${point.id}" aria-label="View on map">
                    <span class="material-icons">map</span>
                  </button>
                  ${point.contentId ? `
                  <button class="view-content" data-id="${point.contentId}" aria-label="View linked content">
                    <span class="material-icons">description</span>
                  </button>
                  ` : ''}
                  <button class="edit-point" data-id="${point.id}" aria-label="Edit point">
                    <span class="material-icons">edit</span>
                  </button>
                  <button class="delete-point" data-id="${point.id}" aria-label="Delete point">
                    <span class="material-icons">delete</span>
                  </button>
                </div>
              `;

              mapPointsContainer.appendChild(pointCard);
            });

            // Add event listeners for the action buttons
            mapPointsContainer.querySelectorAll('.view-on-map').forEach(button => {
              button.addEventListener('click', () => {
                const pointId = button.getAttribute('data-id');
                window.location.href = `/map.html?point=${pointId}`;
              });
            });

            mapPointsContainer.querySelectorAll('.view-content').forEach(button => {
              button.addEventListener('click', () => {
                const contentId = button.getAttribute('data-id');
                window.location.href = `/drawer.html?content=${contentId}`;
              });
            });

            mapPointsContainer.querySelectorAll('.edit-point').forEach(button => {
              button.addEventListener('click', () => {
                const pointId = button.getAttribute('data-id');
                window.location.href = `/map.html?edit=${pointId}`;
              });
            });

            mapPointsContainer.querySelectorAll('.delete-point').forEach(button => {
              button.addEventListener('click', async () => {
                const pointId = button.getAttribute('data-id');

                if (confirm('Are you sure you want to delete this map point?')) {
                  try {
                    const response = await fetch(`/api/globe/points/${pointId}`, {
                      method: 'DELETE',
                      credentials: 'include'
                    });

                    if (response.ok) {
                      // Remove the point card from the DOM
                      button.closest('.map-point-card').remove();

                      // If no more points, show empty state
                      if (mapPointsContainer.children.length === 0) {
                        emptyState.classList.remove('hidden');
                      }
                    } else {
                      alert('Failed to delete map point. Please try again.');
                    }
                  } catch (error) {
                    console.error('Error deleting map point:', error);
                    alert('Failed to delete map point. Please try again.');
                  }
                }
              });
            });
          } else {
            // If no points, ensure empty state is visible
            emptyState.classList.remove('hidden');
          }
        } else {
          console.warn(`Map points fetch failed with status: ${mapPointsResponse.status}`);
        }
      } catch (mapPointsError) {
        console.warn('Could not load map points:', mapPointsError);
      }

      // Populate user preferences
      populateUserPreferences(user);

      // Show profile data, hide loading
      loadingEl.classList.add('hidden');
      notAuthenticatedEl.classList.add('hidden');
      profileDataEl.classList.remove('hidden');

      // Set up edit profile button
      editProfileBtn.addEventListener('click', () => {
        // Redirect to edit profile page (to be implemented)
        window.location.href = '/edit-profile.html';
      });

      // Set up generate recovery key button
      generateRecoveryKeyBtn.addEventListener('click', async () => {
        try {
          // Show a confirmation dialog
          const confirmed = confirm(
            'WARNING: Generating a new recovery key will invalidate your old key. ' +
            'Make sure to save the new key securely. Continue?'
          );

          if (!confirmed) {
            return;
          }

          // Generate new recovery key
          const response = await fetch('/api/auth/jwt/generate-recovery-key', {
            method: 'POST',
            credentials: 'include'
          });

          if (!response.ok) {
            throw new Error(`Failed to generate recovery key: ${response.status} ${response.statusText}`);
          }

          const result = await response.json();

          if (!result.success || !result.recoveryKey) {
            throw new Error('Invalid response from server');
          }

          // Display the recovery key in the modal
          recoveryKeyDisplay.textContent = result.recoveryKey;
          recoveryKeyModal.classList.remove('hidden');

          // Set up copy button only once
          copyRecoveryKeyBtn.onclick = () => {
            navigator.clipboard.writeText(result.recoveryKey)
              .then(() => {
                const originalText = copyRecoveryKeyBtn.textContent;
                copyRecoveryKeyBtn.textContent = 'Copied!';
                setTimeout(() => {
                  copyRecoveryKeyBtn.textContent = originalText;
                }, 2000);
              })
              .catch(err => {
                console.error('Failed to copy: ', err);
                alert('Failed to copy to clipboard. Please select and copy the key manually.');
              });
          };

          // Set up close button only once
          closeModalBtn.onclick = () => {
            recoveryKeyModal.classList.add('hidden');
          };

        } catch (error) {
          console.error('Recovery key generation error:', error);
          alert('Failed to generate recovery key. Please try again.');
        }
      });

      // Set up logout button
      logoutBtn.addEventListener('click', async () => {
        try {
          await fetch('/api/auth/jwt/logout', {
            method: 'POST',
            credentials: 'include'
          });

          // Redirect to login page after logout
          window.location.href = '/auth/login.html?message=' + encodeURIComponent('You have been logged out successfully.');
        } catch (error) {
          console.error('Logout error:', error);
          alert('Failed to log out. Please try again.');
        }
      });

    } catch (error) {
      console.error('Profile loading error:', error);

      // Show not authenticated state
      loadingEl.classList.add('hidden');
      notAuthenticatedEl.classList.add('hidden');
      profileDataEl.classList.add('hidden');
    }
  };

  // Load profile data on page load
  loadProfileData();
});
