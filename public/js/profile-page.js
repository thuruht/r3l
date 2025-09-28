import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState } from './utils/ui-helpers.js';

// A helper to display errors in a consistent way
function displayError(container, message, code) {
  console.error(`Error ${code}: ${message}`);
  const errorHtml = `
    <div class="alert alert-error">
      <span class="material-icons">error_outline</span>
      <div>
        <strong>An Error Occurred</strong>
        <p>${message}</p>
        <small>Error code: ${code}</small>
      </div>
    </div>
  `;
  if (typeof container === 'string') {
    document.getElementById(container).innerHTML = errorHtml;
  } else {
    container.innerHTML = errorHtml;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // Initialize the navigation bar
  NavigationBar.init('profile');

  const loadingEl = document.getElementById('loading');
  const notAuthenticatedEl = document.getElementById('not-authenticated');
  const profileDataEl = document.getElementById('profile-data');
  const errorContainerEl = document.getElementById('error-container');

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

  // Onboarding modal elements
  const onboardingModal = document.getElementById('onboarding-modal');
  const dismissOnboardingBtn = document.getElementById('dismiss-onboarding-btn');

  // Update lurker randomness value display when slider changes
  lurkerRandomness.addEventListener('input', () => {
    lurkerRandomnessValue.textContent = `${lurkerRandomness.value}%`;
  });

  // Save privacy settings
  savePrivacySettingsBtn.addEventListener('click', async () => {
    try {
      const userId = savePrivacySettingsBtn.getAttribute('data-user-id');
      if (!userId) throw new Error('User ID not found');

      let defaultContentVisibility = 'public';
      for (const radio of defaultVisibilityRadios) {
        if (radio.checked) {
          defaultContentVisibility = radio.value;
          break;
        }
      }

      const preferences = {
        lurkerModeEnabled: lurkerModeToggle.checked,
        lurkerModeRandomness: parseInt(lurkerRandomness.value),
        showLocationByDefault: locationVisibilityToggle.checked,
        defaultContentVisibility,
      };

      const response = await window.r3l.authenticatedFetch('/api/user/preferences', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) throw new Error(`Failed to save preferences: ${response.status}`);
      alert('Preferences saved successfully');
    } catch (error) {
      displayError(errorContainerEl, 'Failed to save preferences.', 'FE-PROF-007');
    }
  });

  function populateUserPreferences(user) {
    savePrivacySettingsBtn.setAttribute('data-user-id', user.id);
    if (!user.preferences) return;

    lurkerModeToggle.checked = !!user.preferences.lurkerModeEnabled;
    const randomness = user.preferences.lurkerModeRandomness || 50;
    lurkerRandomness.value = randomness;
    lurkerRandomnessValue.textContent = `${randomness}%`;
    locationVisibilityToggle.checked = !!user.preferences.showLocationByDefault;

    const visibility = user.preferences.defaultContentVisibility || 'public';
    for (const radio of defaultVisibilityRadios) {
      if (radio.value === visibility) {
        radio.checked = true;
        break;
      }
    }
  }

  const handleOnboarding = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isNewRegistration = urlParams.get('new') === 'true';
    const onboardingComplete = localStorage.getItem('onboardingComplete');
    if (isNewRegistration && !onboardingComplete) {
      onboardingModal.classList.remove('hidden');
    }
    dismissOnboardingBtn.addEventListener('click', () => {
      onboardingModal.classList.add('hidden');
      localStorage.setItem('onboardingComplete', 'true');
    });
  };

  const loadProfileData = async () => {
    try {
      const response = await window.r3l.authenticatedFetch('/api/profile');

      if (response.status === 401) {
        loadingEl.classList.add('hidden');
        profileDataEl.classList.add('hidden');
        notAuthenticatedEl.classList.remove('hidden');
        return;
      }
      if (!response.ok) throw new Error(`API error: ${response.status} ${response.statusText}`);

      const user = await response.json();
      if (!user || !user.username) throw new Error('Invalid user data received.');

      populateProfileUI(user);
      loadStats(user.id);
      loadMapPoints(user.id);
      setupAvatarUpload(user);

      loadingEl.classList.add('hidden');
      notAuthenticatedEl.classList.add('hidden');
      profileDataEl.classList.remove('hidden');
    } catch (error) {
      loadingEl.classList.add('hidden');
      notAuthenticatedEl.classList.add('hidden');
      profileDataEl.classList.remove('hidden');
      displayError(errorContainerEl, 'Could not load your profile.', 'FE-PROF-001');
    }
  };

  function populateProfileUI(user) {
    profileNameEl.textContent = user.displayName || 'R3L User';
    profileUsernameEl.textContent = `@${user.username}`;
    profileJoinedEl.textContent = user.createdAt
      ? `Joined on ${new Date(user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`
      : 'Join date unknown';

    if (user.avatarUrl) {
      profileAvatarEl.src = user.avatarUrl;
    } else if (user.avatar_key) {
      profileAvatarEl.src = `/api/files/${user.avatar_key}`;
    } else {
      profileAvatarEl.src = '/icons/user-default.svg';
    }
    profileAvatarEl.alt = `${user.displayName || user.username}'s avatar`;

    populateUserPreferences(user);
    setupActionButtons(user);

    // Auth providers
    authProvidersEl.innerHTML = `
      <div class="auth-provider"><span class="material-icons" aria-hidden="true">key</span><span>Password</span></div>
      <div class="auth-provider"><span class="material-icons" aria-hidden="true">security</span><span>Recovery Key</span></div>
    `;
  }

  async function loadStats(userId) {
    try {
      const statsResponse = await window.r3l.authenticatedFetch('/api/user/stats');
      if (!statsResponse.ok) throw new Error('Stats fetch failed');
      const stats = await statsResponse.json();
      statContributionsEl.textContent = stats.contributions || 0;
      statDrawersEl.textContent = stats.drawers || 0;
      statConnectionsEl.textContent = stats.connections || 0;
    } catch (error) {
      displayEmptyState(statsListEl, 'Could not load stats.', generateRefCode('FE-PROF-002'));
    }
  }

  async function loadMapPoints(userId) {
    const mapPointsContainer = document.getElementById('user-map-points');
    const emptyState = document.querySelector('.empty-state');
    try {
      // Globe data not implemented in backend
      const res = { ok: true, json: async () => [] };
      if (!res.ok) throw new Error('Map points fetch failed');
      const mapPoints = await res.json();
      if (!mapPoints || mapPoints.length === 0) {
        emptyState.classList.remove('hidden');
        mapPointsContainer.innerHTML = '';
        return;
      }
      emptyState.classList.add('hidden');
      mapPointsContainer.innerHTML = '';
      mapPoints.forEach(point => {
        const pointCard = document.createElement('div');
        pointCard.className = 'map-point-card';
        const latitude = parseFloat(point.latitude).toFixed(4);
        const longitude = parseFloat(point.longitude).toFixed(4);
        pointCard.innerHTML = `
          <h4 class="map-point-title">${point.title}</h4>
          <p class="map-point-coords">${latitude}, ${longitude}</p>
          ${point.description ? `<p class="map-point-desc">${point.description}</p>` : ''}
          <div class="map-point-actions">
            <button class="view-on-map" data-id="${point.id}" aria-label="View on Map"><span class="material-icons" aria-hidden="true">map</span></button>
            ${point.contentId ? `<button class="view-content" data-id="${point.contentId}" aria-label="View Content"><span class="material-icons" aria-hidden="true">description</span></button>` : ''}
            <button class="edit-point" data-id="${point.id}" aria-label="Edit Point"><span class="material-icons" aria-hidden="true">edit</span></button>
            <button class="delete-point" data-id="${point.id}" aria-label="Delete Point"><span class="material-icons" aria-hidden="true">delete</span></button>
          </div>
        `;
        mapPointsContainer.appendChild(pointCard);
      });
    } catch (error) {
      displayEmptyState(mapPointsContainer, 'Could not load map points.', generateRefCode('FE-PROF-003'));
    }
  }

  function setupAvatarUpload(user) {
    const avatarUploadInput = document.getElementById('avatar-upload');
    avatarUploadInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file.');
        return;
      }
      profileAvatarEl.src = '/icons/loading-spinner.svg';
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await fetch('/api/files/avatar', { method: 'POST', credentials: 'include', body: formData });
        if (!response.ok) throw new Error('Upload failed');
        const result = await response.json();
        if (result.success && result.avatarUrl) {
          profileAvatarEl.src = result.avatarUrl;
        } else {
          throw new Error('Invalid response');
        }
      } catch (error) {
        displayError(errorContainerEl, 'Failed to upload avatar.', 'FE-PROF-004');
        profileAvatarEl.src = user.avatarUrl || (user.avatar_key ? `/api/files/${user.avatar_key}` : '/icons/user-default.svg');
      }
    });
  }

  function setupActionButtons(user) {
    editProfileBtn.addEventListener('click', () => window.location.href = '/edit-profile.html');

    generateRecoveryKeyBtn.addEventListener('click', async () => {
      if (!confirm('WARNING: Generating a new recovery key will invalidate your old one. Continue?')) return;
      try {
        // Recovery key generation not implemented in backend
        const res = { ok: false };
        if (!res.ok) throw new Error('Failed to generate');
        const result = await res.json();
        if (!result.success || !result.recoveryKey) throw new Error('Invalid response');
        recoveryKeyDisplay.textContent = result.recoveryKey;
        recoveryKeyModal.classList.remove('hidden');
        copyRecoveryKeyBtn.onclick = () => {
          navigator.clipboard.writeText(result.recoveryKey).then(() => {
            copyRecoveryKeyBtn.textContent = 'Copied!';
            setTimeout(() => copyRecoveryKeyBtn.textContent = 'Copy to Clipboard', 2000);
          });
        };
        closeModalBtn.onclick = () => recoveryKeyModal.classList.add('hidden');
      } catch (error) {
        displayError(errorContainerEl, 'Could not generate recovery key.', 'FE-PROF-005');
      }
    });

    logoutBtn.addEventListener('click', async () => {
      try {
        // Use secure logout method
        if (window.r3l && window.r3l.logout) {
          window.r3l.logout();
        } else {
          // Fallback logout
          document.cookie = 'r3l_session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
          window.location.href = '/auth/login.html?message=You have been logged out.';
        }
      } catch (error) {
        displayError(errorContainerEl, 'Logout failed.', 'FE-PROF-006');
      }
    });
  }

  loadProfileData();
  handleOnboarding();
});

