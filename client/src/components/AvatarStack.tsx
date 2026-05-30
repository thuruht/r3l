import React from 'react';
import styles from '../styles/AvatarStack.module.css';

interface User {
  id: string;
  name: string;
  color?: string;
  avatar?: string;
}

interface AvatarStackProps {
  users: User[];
  max?: number;
}

const AvatarStack: React.FC<AvatarStackProps> = ({ users, max = 5 }) => {
  const visibleUsers = users.slice(0, max);
  const remainingCount = users.length - max;

  const stringToColor = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  };

  return (
    <div className={styles.avatarStack}>
      {visibleUsers.map((user, index) => (
        <div
          key={user.id}
          className={styles.avatar}
          style={{
            zIndex: users.length - index,
            backgroundColor: user.color || stringToColor(user.name || user.id),
          }}
          title={user.name}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} />
          ) : (
            <span>{(user.name || 'A').charAt(0).toUpperCase()}</span>
          )}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className={`${styles.avatar} ${styles.moreCount}`} style={{ zIndex: 0 }}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

export default AvatarStack;
