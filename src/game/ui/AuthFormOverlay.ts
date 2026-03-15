import Phaser from 'phaser';
import { AuthManager } from '../systems/AuthManager';

/**
 * Creates DOM-based input fields positioned over the Phaser canvas
 * for the login/register form. DOM inputs are needed because Phaser
 * has no native text input — this approach supports mobile keyboards,
 * paste, and autofill.
 */

interface AuthFormElements {
  wrapper: HTMLDivElement;
  emailInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  errorDiv: HTMLDivElement;
  destroy: () => void;
}

const INPUT_STYLE = `
  width: 100%;
  padding: 12px 16px;
  background: rgba(10, 10, 26, 0.95);
  border: 1px solid #c9a84c;
  border-radius: 2px;
  color: #e0d5c0;
  font-family: Georgia, serif;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
`;

const INPUT_FOCUS_STYLE = `border-color: #e8c55a; box-shadow: 0 0 8px rgba(201, 168, 76, 0.3);`;

function applyFocusListeners(input: HTMLInputElement): void {
  input.addEventListener('focus', () => {
    input.style.cssText = INPUT_STYLE + INPUT_FOCUS_STYLE;
  });
  input.addEventListener('blur', () => {
    input.style.cssText = INPUT_STYLE;
  });
}

export function createAuthFormElements(
  scene: Phaser.Scene,
  centerX: number,
  topY: number,
  formWidth: number,
): AuthFormElements {
  const canvas = scene.game.canvas;
  const canvasRect = canvas.getBoundingClientRect();
  const scaleX = canvasRect.width / canvas.width;
  const scaleY = canvasRect.height / canvas.height;

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: absolute;
    left: ${canvasRect.left + (centerX - formWidth / 2) * scaleX}px;
    top: ${canvasRect.top + topY * scaleY}px;
    width: ${formWidth * scaleX}px;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    gap: ${12 * scaleY}px;
  `;

  // Email input
  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = 'Email address';
  emailInput.autocomplete = 'email';
  emailInput.style.cssText = INPUT_STYLE;
  emailInput.style.fontSize = `${16 * scaleY}px`;
  applyFocusListeners(emailInput);
  wrapper.appendChild(emailInput);

  // Password input
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = 'Password';
  passwordInput.autocomplete = 'current-password';
  passwordInput.style.cssText = INPUT_STYLE;
  passwordInput.style.fontSize = `${16 * scaleY}px`;
  applyFocusListeners(passwordInput);
  wrapper.appendChild(passwordInput);

  // Error message area
  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    color: #ff6b6b;
    font-family: Georgia, serif;
    font-size: ${14 * scaleY}px;
    text-align: center;
    min-height: ${20 * scaleY}px;
  `;
  wrapper.appendChild(errorDiv);

  document.body.appendChild(wrapper);

  // Handle enter key on password field
  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      passwordInput.blur();
    }
  });

  const destroy = () => {
    wrapper.remove();
  };

  return { wrapper, emailInput, passwordInput, errorDiv, destroy };
}

/**
 * Performs sign-in or sign-up and returns error message if any.
 */
export async function submitAuthForm(
  email: string,
  password: string,
  mode: 'signin' | 'signup',
): Promise<string | null> {
  const auth = AuthManager.getInstance();

  if (!email.trim() || !password.trim()) {
    return 'Please enter email and password';
  }

  if (mode === 'signup' && password.length < 6) {
    return 'Password must be at least 6 characters';
  }

  const result = mode === 'signin'
    ? await auth.signInWithEmail(email, password)
    : await auth.signUpWithEmail(email, password);

  return result.error ?? null;
}
