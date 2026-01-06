/**
 * SIGN IN SCREEN - WEB VERSION
 * Authentication for web/desktop
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './SignInScreenWeb.css';
import { AuthService } from '../../services/AuthService';

const SignInScreenWeb = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert('Please enter email and password');
      return;
    }

    try {
      setLoading(true);
      const result = await AuthService.signIn(email, password);

      if (result.success) {
        navigate('/dashboard');
      } else {
        alert(result.error || 'Sign in failed');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      alert('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signin-container">
      <div className="signin-left">
        <div className="signin-branding">
          <div className="logo">
            <i className="fas fa-store"></i>
          </div>
          <h1>MindStack</h1>
          <p className="tagline">Complete Business Management System</p>
          
          <div className="features-list">
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Point of Sale</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Inventory Management</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Accounting & GST</span>
            </div>
            <div className="feature-item">
              <i className="fas fa-check-circle"></i>
              <span>Audit & Compliance</span>
            </div>
          </div>
        </div>
      </div>

      <div className="signin-right">
        <div className="signin-form-container">
          <div className="signin-header">
            <h2>Welcome Back</h2>
            <p>Sign in to your account to continue</p>
          </div>

          <form className="signin-form" onSubmit={handleSignIn}>
            <div className="form-group">
              <label>Email Address</label>
              <div className="input-with-icon">
                <i className="fas fa-envelope"></i>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="input-with-icon">
                <i className="fas fa-lock"></i>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="form-options">
              <label className="remember-me">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>
              <a href="/forgot-password" className="forgot-password">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              className="btn-signin"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-small"></span>
                  Signing in...
                </>
              ) : (
                <>
                  <i className="fas fa-sign-in-alt"></i>
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="signin-footer">
            <p>Don't have an account? <a href="/signup">Sign Up</a></p>
          </div>

          <div className="demo-credentials">
            <p className="demo-title">Demo Credentials:</p>
            <p>Email: demo@mindstack.com</p>
            <p>Password: demo123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInScreenWeb;
