const authService = require('./auth.service');

const signup = async (req, res, next) => {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json({ message: 'Organization and account created successfully', ...result });
  } catch (err) { next(err); }
};

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.json({ message: 'Login successful', ...result });
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.json(result);
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.body.refreshToken);
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};

const forgotPassword = async (req, res, next) => {
  try {
    const token = await authService.forgotPassword(req.body.email);
    // Dev mode: return token in response. Production: send email.
    res.json({
      message: 'If that email exists, a reset link has been generated.',
      ...(process.env.NODE_ENV !== 'production' && token ? { resetToken: token } : {}),
    });
  } catch (err) { next(err); }
};

const resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body.token, req.body.password);
    res.json({ message: 'Password reset successfully. Please log in again.' });
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const data = await authService.getMe(req.user.userId, req.user.membershipId);
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = { signup, login, refresh, logout, forgotPassword, resetPassword, getMe };
