// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, isLoggedIn } from '../services/auth';
import '../styles/App.css';

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const result = await login({ email, password });

      if (isLoggedIn()) {
        navigate('/dashboard/client');
        window.location.reload();
      } else {
        setError(result.message || "Login failed.");
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  };

  return (
    <div className="modern-login-page">
      <div className="modern-login-box">
        <h3 className="login-subtitle">Log in to</h3>
        <h1 className="login-brand">Anylog</h1>

        <form onSubmit={handleSubmit} className="modern-login-form">
          <div className="form-group with-icon">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              placeholder="Your Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group with-icon">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="Your Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button type="submit" className="login-submit">Log in</button>
        </form>

        <div className="login-links">
          <Link to="/forgot-password">Forgot password?</Link>
          <p>Don't have an account? <Link to="/signup">Sign up</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
