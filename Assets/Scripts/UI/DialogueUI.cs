using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections;

public class DialogueUI : MonoBehaviour
{
    [Header("UI Elements")]
    public GameObject dialoguePanel;
    public TextMeshProUGUI speakerNameText;
    public TextMeshProUGUI dialogueText;
    public Button continueButton;
    public Transform choicesContainer;
    public GameObject choiceButtonPrefab;
    
    [Header("Animation")]
    public float typeSpeed = 0.03f;
    
    private bool isTyping = false;
    private string currentFullText = "";
    
    void Start()
    {
        Hide();
        continueButton.onClick.AddListener(OnContinueClicked);
    }
    
    public void ShowLine(string speaker, string text)
    {
        dialoguePanel.SetActive(true);
        speakerNameText.text = speaker;
        currentFullText = text;
        StartCoroutine(TypeText(text));
    }
    
    IEnumerator TypeText(string text)
    {
        isTyping = true;
        dialogueText.text = "";
        
        foreach (char c in text)
        {
            dialogueText.text += c;
            yield return new WaitForSeconds(typeSpeed);
        }
        
        isTyping = false;
    }
    
    void OnContinueClicked()
    {
        if (isTyping)
        {
            StopAllCoroutines();
            dialogueText.text = currentFullText;
            isTyping = false;
        }
        else
        {
            DialogueManager.Instance.AdvanceLine();
        }
    }
    
    public void ShowChoices(DialogueChoice[] choices)
    {
        // Clear old choices
        foreach (Transform child in choicesContainer)
        {
            Destroy(child.gameObject);
        }
        
        foreach (var choice in choices)
        {
            GameObject btn = Instantiate(choiceButtonPrefab, choicesContainer);
            btn.GetComponentInChildren<TextMeshProUGUI>().text = choice.choiceText;
            btn.GetComponent<Button>().onClick.AddListener(() => OnChoiceSelected(choice));
        }
    }
    
    void OnChoiceSelected(DialogueChoice choice)
    {
        DialogueManager.Instance.SelectChoice(Array.IndexOf(choicesContainer.GetComponentsInChildren<Button>(), GetComponent<Button>()));
    }
    
    public void Hide()
    {
        dialoguePanel.SetActive(false);
    }
}
