using UnityEngine;
using TMPro;
using UnityEngine.UI;

public class CodeLockPuzzle : MonoBehaviour
{
    [Header("Puzzle Settings")]
    public string correctCode = "1234";
    public int codeLength = 4;
    
    [Header("UI References")]
    public TextMeshProUGUI displayText;
    public Button[] numberButtons;
    public Button submitButton;
    public Button clearButton;
    public Button backspaceButton;
    
    private string currentInput = "";
    
    void Start()
    {
        ClearDisplay();
        
        // Add listeners to number buttons
        for (int i = 0; i < numberButtons.Length; i++)
        {
            int digit = i;
            numberButtons[i].onClick.AddListener(() => OnNumberClicked(digit.ToString()));
        }
        
        submitButton.onClick.AddListener(OnSubmitClicked);
        clearButton.onClick.AddListener(OnClearClicked);
        backspaceButton.onClick.AddListener(OnBackspaceClicked);
    }
    
    void OnNumberClicked(string number)
    {
        if (currentInput.Length < codeLength)
        {
            currentInput += number;
            UpdateDisplay();
        }
    }
    
    void OnSubmitClicked()
    {
        if (currentInput == correctCode)
        {
            Debug.Log("CODE CORRECT - Puzzle Solved!");
            // Trigger success event
        }
        else
        {
            Debug.Log("CODE INCORRECT");
            currentInput = "";
            UpdateDisplay();
        }
    }
    
    void OnClearClicked()
    {
        currentInput = "";
        UpdateDisplay();
    }
    
    void OnBackspaceClicked()
    {
        if (currentInput.Length > 0)
        {
            currentInput = currentInput.Substring(0, currentInput.Length - 1);
            UpdateDisplay();
        }
    }
    
    void UpdateDisplay()
    {
        string display = currentInput;
        
        // Show underscores for remaining digits
        for (int i = currentInput.Length; i < codeLength; i++)
        {
            display += "_";
        }
        
        if (displayText != null)
        {
            displayText.text = display;
        }
    }
    
    void ClearDisplay()
    {
        currentInput = "";
        UpdateDisplay();
    }
}
