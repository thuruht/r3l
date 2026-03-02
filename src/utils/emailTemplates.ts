export function pwdRedoEmailTemp(username: string, resetToken: string): string {
    // Other potential variables for future use:
    // const expirationHours = 1;
    // const supportEmail = 'support@r3l.distorted.work';
    // const appName = 'Rel F';
    // const actionUrl = `https://r3l.distorted.work/reset-password?token=${resetToken}`;

    return `<p>Hi ${username},</p><p>Click <a href="https://r3l.distorted.work/reset-password?token=${resetToken}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`;
}
