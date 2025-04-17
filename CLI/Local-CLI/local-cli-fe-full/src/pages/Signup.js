import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, isLoggedIn } from '../services/auth';
import '../styles/App.css';

const Signup = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const result = await signup({ email, password, firstName, lastName });
      if (isLoggedIn()) {
        navigate('/dashboard/client');
        window.location.reload();
      } else {
        setError(result.message || "Signup failed.");
      }
    } catch (err) {
      setError(err.message || "Signup failed.");
    }
  };

  return (
    <div className="modern-login-page">
      <div className="modern-login-box">
        <div className="signup-brand">Sign Up</div>
        <p className="signup-subtitle">Create your account to get started</p>
        <form onSubmit={handleSubmit} className="modern-login-form">
          <div className="form-group with-icon">
            <i className="fas fa-user"></i>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="form-group with-icon">
            <i className="fas fa-user"></i>
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </div>
          <div className="form-group with-icon">
            <i className="fas fa-envelope"></i>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group with-icon">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-group with-icon">
            <i className="fas fa-lock"></i>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="login-submit">Sign Up</button>
        </form>
        <div className="login-links">
          Already have an account? <Link to="/login">Login here</Link>.
        </div>
      </div>
    </div>
  );
};

export default Signup;