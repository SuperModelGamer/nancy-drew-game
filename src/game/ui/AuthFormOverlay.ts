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

const LABEL_STYLE = `
  font-family: Georgia, serif;
  color: #c9a84c;
  letter-spacing: 1px;
  margin-bottom: 4px;
  display: block;
`;

const INPUT_STYLE = `
  width: 100%;
  padding: 14px 16px;
  background: rgba(8, 7, 20, 0.95);
  border: 1.5px solid rgba(201, 168, 76, 0.5);
  border-radius: 1px;
  color: #e0d5c0;
  font-family: Georgia, serif;
  font-size: 16px;
  outline: none;
  box-sizing: border-box;
`;

const INPUT_FOCUS_STYLE = `border-color: #e8c55a; box-shadow: 0 0 10px rgba(201, 168, 76, 0.25);`;

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
    gap: ${6 * scaleY}px;
  `;

  // Email label
  const emailLabel = document.createElement('label');
  emailLabel.textContent = 'Email';
  emailLabel.style.cssText = LABEL_STYLE;
  emailLabel.style.fontSize = `${16 * scaleY}px`;
  wrapper.appendChild(emailLabel);

  // Email input container (for icon overlay)
  const emailContainer = document.createElement('div');
  emailContainer.style.cssText = `position: relative; width: 100%;`;

  const emailInput = document.createElement('input');
  emailInput.type = 'email';
  emailInput.placeholder = '';
  emailInput.autocomplete = 'email';
  emailInput.style.cssText = INPUT_STYLE;
  emailInput.style.fontSize = `${16 * scaleY}px`;
  emailInput.style.paddingRight = `${44 * scaleX}px`;
  applyFocusListeners(emailInput);
  emailContainer.appendChild(emailInput);

  // Person icon inside email field
  const emailIcon = document.createElement('span');
  emailIcon.textContent = '\u{1F464}';
  emailIcon.style.cssText = `
    position: absolute;
    right: ${12 * scaleX}px;
    top: 50%;
    transform: translateY(-50%);
    font-size: ${16 * scaleY}px;
    color: #c9a84c;
    pointer-events: none;
    opacity: 0.6;
  `;
  emailContainer.appendChild(emailIcon);
  wrapper.appendChild(emailContainer);

  // Spacer
  const spacer = document.createElement('div');
  spacer.style.height = `${8 * scaleY}px`;
  wrapper.appendChild(spacer);

  // Password label
  const passwordLabel = document.createElement('label');
  passwordLabel.textContent = 'Password';
  passwordLabel.style.cssText = LABEL_STYLE;
  passwordLabel.style.fontSize = `${16 * scaleY}px`;
  wrapper.appendChild(passwordLabel);

  // Password input
  const passwordInput = document.createElement('input');
  passwordInput.type = 'password';
  passwordInput.placeholder = '';
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
