/* eslint-env es6, browser */
import { NavigationBar } from './components/navigation.js';
import { generateRefCode, displayEmptyState } from './utils/ui-helpers.js';

// A helper to display errors in a consistent way
function displayError(container, message, code) {
  console.error(`Error ${code}: ${message}`);
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-error';
  
  const icon = document.createElement('span');
  icon.className = 'material-icons';
  icon.textContent = 'error_outline';
  
  const contentDiv = document.createElement('div');
  const strong = document.createElement('strong');
  strong.textContent = 'An Error Occurred';
  const p = document.createElement('p');
  p.textContent = message;
  const small = document.createElement('small');
  small.textContent = `Error code: ${code}`;
  
  contentDiv.appendChild(strong);
  contentDiv.appendChild(p);
  contentDiv.appendChild(small);
  
  alertDiv.appendChild(icon);
  alertDiv.appendChild(contentDiv);
  
  const targetContainer = typeof container === 'string' ? document.getElementById(container) : container;
  targetContainer.innerHTML = '';
  targetContainer.appendChild(alertDiv);
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

      const response = await fetch(`/api/users/${userId}/preferences`, {
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
      const response = await fetch('/api/auth/jwt/profile', { credentials: 'include' });

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
      const statsResponse = await fetch(`/api/users/${userId}/stats`, { credentials: 'include' });
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
      const res = await fetch(`/api/globe/data-points?userId=${userId}`, { credentials: 'include' });
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
        const title = document.createElement('h4');
        title.className = 'map-point-title';
        title.textContent = point.title;
        
        const coords = document.createElement('p');
        coords.className = 'map-point-coords';
        coords.textContent = `${latitude}, ${longitude}`;
        
        pointCard.appendChild(title);
        pointCard.appendChild(coords);
        
        if (point.description) {
          const desc = document.createElement('p');
          desc.className = 'map-point-desc';
          desc.textContent = point.description;
          pointCard.appendChild(desc);
        }
        
        const actions = document.createElement('div');
        actions.className = 'map-point-actions';
        
        const viewMapBtn = document.createElement('button');
        viewMapBtn.className = 'view-on-map';
        viewMapBtn.dataset.id = point.id;
        viewMapBtn.setAttribute('aria-label', 'View on Map');
        const mapIcon = document.createElement('span');
        mapIcon.className = 'material-icons';
        mapIcon.setAttribute('aria-hidden', 'true');
        mapIcon.textContent = 'map';
        viewMapBtn.appendChild(mapIcon);
        actions.appendChild(viewMapBtn);
        
        if (point.contentId) {
          const viewContentBtn = document.createElement('button');
          viewContentBtn.className = 'view-content';
          viewContentBtn.dataset.id = point.contentId;
          viewContentBtn.setAttribute('aria-label', 'View Content');
          const descIcon = document.createElement('span');
          descIcon.className = 'material-icons';
          descIcon.setAttribute('aria-hidden', 'true');
          descIcon.textContent = 'description';
          viewContentBtn.appendChild(descIcon);
          actions.appendChild(viewContentBtn);
        }
        
        const editBtn = document.createElement('button');
        editBtn.className = 'edit-point';
        editBtn.dataset.id = point.id;
        editBtn.setAttribute('aria-label', 'Edit Point');
        const editIcon = document.createElement('span');
        editIcon.className = 'material-icons';
        editIcon.setAttribute('aria-hidden', 'true');
        editIcon.textContent = 'edit';
        editBtn.appendChild(editIcon);
        actions.appendChild(editBtn);
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-point';
        deleteBtn.dataset.id = point.id;
        deleteBtn.setAttribute('aria-label', 'Delete Point');
        const deleteIcon = document.createElement('span');
        deleteIcon.className = 'material-icons';
        deleteIcon.setAttribute('aria-hidden', 'true');
        deleteIcon.textContent = 'delete';
        deleteBtn.appendChild(deleteIcon);
        actions.appendChild(deleteBtn);
        
        pointCard.appendChild(actions);
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

  function setupActionButtons(_user) {
    editProfileBtn.addEventListener('click', () => window.location.href = '/edit-profile.html');

    generateRecoveryKeyBtn.addEventListener('click', async () => {
      if (!confirm('WARNING: Generating a new recovery key will invalidate your old one. Continue?')) return;
      try {
        const res = await fetch('/api/auth/jwt/generate-recovery-key', { method: 'POST', credentials: 'include' });
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
        await fetch('/api/auth/jwt/logout', { method: 'POST', credentials: 'include' });
        window.location.href = '/auth/login.html?message=You have been logged out.';
      } catch (error) {
        displayError(errorContainerEl, 'Logout failed.', 'FE-PROF-006');
      }
    });
  }

  loadProfileData();
  handleOnboarding();
});

