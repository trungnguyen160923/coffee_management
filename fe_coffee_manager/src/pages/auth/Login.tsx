import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Coffee, Eye, EyeOff, User, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import loginImageSmall from '../../assets/images/anh_login_nho.jpg';
import loginImageMedium from '../../assets/images/anh_login_vua.jpg';
import loginImageLarge from '../../assets/images/anh_login_to.jpg';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus vào ô email khi mở trang
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailValue || !emailRegex.test(emailValue)) {
      setEmailError('Please enter a valid email format');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (passwordValue: string) => {
    if (!passwordValue || passwordValue.trim() === '') {
      setPasswordError('Please enter your password');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateForm = () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    return isEmailValid && isPasswordValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setEmailError('');
    setPasswordError('');
    
    // Validate form trước khi gửi
    if (!validateForm()) {
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await login(email, password);
      // Chuyển hướng dựa trên role
      const userRole = response.user.role;
      switch (userRole) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'manager':
          navigate('/manager', { replace: true });
          break;
        case 'staff':
          navigate('/staff', { replace: true });
          break;
        default:
          console.warn('Unknown role:', userRole);
          navigate('/', { replace: true });
      }
    } catch (err: any) {
      // Use error message from backend or fallback
      const errorMessage = err?.message || 'Incorrect email or password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--off-white)] flex items-center justify-center px-4 py-6">
      <div className="max-w-5xl w-full bg-white/0 rounded-3xl shadow-[0_24px_60px_var(--shadow-light)] border border-[var(--light-brown)] overflow-hidden flex flex-col md:flex-row">
        {/* Visual panel - Mobile: top, Desktop: left 60% */}
        <div className="flex md:w-[60%] relative items-center justify-center overflow-hidden bg-[var(--coffee-brown)] h-64 md:h-auto">
          {/* Background images - responsive */}
          <picture className="absolute inset-0 w-full h-full">
            <source media="(min-width: 1024px)" srcSet={loginImageLarge} />
            <source media="(min-width: 768px)" srcSet={loginImageMedium} />
            <img
              src={loginImageSmall}
              alt="Coffee background"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </picture>
          
          {/* Overlay gradient */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, var(--overlay-start), var(--overlay-end))',
            }}
          />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,var(--overlay-end),transparent_60%)]" />
          
          {/* Content - Mobile: chỉ logo, Desktop: logo + welcome text */}
          <div className="relative z-10 w-full h-full flex flex-col">
            {/* Logo - hiển thị trên cả mobile và desktop */}
            <div className="px-6 md:px-8 pt-6 md:pt-8">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-[var(--earthy-orange)] shadow-md flex items-center justify-center">
                  <Coffee className="h-5 w-5 text-[var(--off-white)]" />
                </div>
                <div>
                  <p className="text-base font-bold text-[var(--off-white)]">
                    CoffeeLink
                  </p>
                  <p className="text-xs text-white font-medium">
                    Smart coffee chain management
                  </p>
                </div>
              </div>
            </div>
            
            {/* Welcome text - chỉ hiển thị trên desktop */}
            <div className="hidden md:flex flex-1 items-center px-10">
              <div className="space-y-4">
                <h2 className="text-3xl font-bold leading-snug text-[var(--off-white)]">
                  Welcome back,
                  <br />
                  ready for a new day?
                </h2>
                <p className="text-sm text-white/95 font-medium max-w-sm">
                  Track orders, manage branches, and optimize operations with just a few clicks.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form panel - Mobile: below image, Desktop: right 40% */}
        <div className="w-full md:w-[40%] bg-[var(--light-beige)] flex items-center justify-center px-6 py-6 md:px-10 md:py-12">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-[var(--light-beige)] shadow-sm flex items-center justify-center border border-[var(--light-brown)] mb-4 mx-auto">
                <Coffee className="h-6 w-6 text-[var(--coffee-brown)]" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-[var(--coffee-brown)] mb-2">
                Sign in
              </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div>
                <label className="block text-sm font-medium text-[var(--coffee-brown)] mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-brown)]">
                    <User className="h-5 w-5" />
                  </div>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) validateEmail(e.target.value);
                    }}
                    onInvalid={(e) => e.preventDefault()}
                    className={`w-full pl-11 pr-4 py-3 rounded-xl border bg-white text-[var(--coffee-brown)] placeholder:text-[var(--muted-brown)] focus:outline-none focus:ring-2 focus:ring-[var(--soft-green)] focus:border-transparent transition-all duration-200 ${
                      emailError ? 'border-red-300' : 'border-[var(--light-brown)]'
                    }`}
                    placeholder="Enter your username or email"
                    autoFocus
                    tabIndex={1}
                  />
                </div>
                {emailError && (
                  <p className="mt-1 text-sm text-red-600">{emailError}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-[var(--coffee-brown)]">
                    Password
                  </label>
                  <a
                    href="#"
                    className="text-sm text-[var(--coffee-brown)] hover:text-[var(--darker-orange)] transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Implement forgot password
                    }}
                    tabIndex={3}
                  >
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-brown)]">
                    <Lock className="h-5 w-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (passwordError) validatePassword(e.target.value);
                    }}
                    onInvalid={(e) => e.preventDefault()}
                    className={`w-full pl-11 pr-11 py-3 rounded-xl border bg-white text-[var(--coffee-brown)] placeholder:text-[var(--muted-brown)] focus:outline-none focus:ring-2 focus:ring-[var(--soft-green)] focus:border-transparent transition-all duration-200 ${
                      passwordError ? 'border-red-300' : 'border-[var(--light-brown)]'
                    }`}
                    placeholder="Enter your password"
                    tabIndex={2}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-brown)] hover:text-[var(--coffee-brown)] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600">{passwordError}</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 rounded-xl font-semibold text-[var(--off-white)] bg-[var(--earthy-orange)] hover:bg-[var(--darker-orange)] shadow-[0_14px_30px_var(--shadow-button)] hover:shadow-[0_18px_36px_var(--shadow-button-hover)] active:shadow-[0_8px_20px_var(--shadow-button-active)] focus:outline-none focus:ring-2 focus:ring-[var(--soft-green)] focus:ring-offset-2 focus:ring-offset-[var(--light-beige)] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                tabIndex={4}
              >
                {submitting ? 'Signing in...' : 'SIGN IN'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}