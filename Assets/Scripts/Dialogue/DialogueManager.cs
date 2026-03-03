using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Events;

public class DialogueManager : MonoBehaviour
{
    public static DialogueManager Instance { get; private set; }
    
    [Header("UI References")]
    public DialogueUI dialogueUI;
    
    [Header("Events")]
    public UnityEvent onDialogueStart;
    public UnityEvent onDialogueEnd;
    
    private DialogueData currentDialogue;
    private int currentNodeIndex = 0;
    private int currentLineIndex = 0;
    private bool isDialogueActive = false;
    
    void Awake()
    {
        if (Instance == null) Instance = this;
    }
    
    public void StartDialogue(DialogueData dialogue)
    {
        currentDialogue = dialogue;
        currentNodeIndex = 0;
        currentLineIndex = 0;
        isDialogueActive = true;
        
        onDialogueStart?.Invoke();
        ShowCurrentLine();
    }
    
    void ShowCurrentLine()
    {
        if (currentDialogue == null) return;
        
        DialogueNode node = currentDialogue.nodes[currentNodeIndex];
        
        if (node.lines.Length > 0 && currentLineIndex < node.lines.Length)
        {
            DialogueLine line = node.lines[currentLineIndex];
            dialogueUI.ShowLine(line.speakerName, line.text);
        }
        else
        {
            // No more lines, show choices or end
            if (node.choices != null && node.choices.Length > 0)
            {
                dialogueUI.ShowChoices(node.choices);
            }
            else
            {
                EndDialogue();
            }
        }
    }
    
    public void AdvanceLine()
    {
        if (!isDialogueActive) return;
        
        DialogueNode node = currentDialogue.nodes[currentNodeIndex];
        
        currentLineIndex++;
        
        if (currentLineIndex >= node.lines.Length)
        {
            if (node.choices != null && node.choices.Length > 0)
            {
                dialogueUI.ShowChoices(node.choices);
            }
            else
            {
                EndDialogue();
            }
        }
        else
        {
            ShowCurrentLine();
        }
    }
    
    public void SelectChoice(int choiceIndex)
    {
        DialogueNode node = currentDialogue.nodes[currentNodeIndex];
        
        if (choiceIndex < node.choices.Length)
        {
            DialogueChoice choice = node.choices[choiceIndex];
            
            // Trigger any events
            if (!string.IsNullOrEmpty(choice.triggerEvent))
            {
                EventManager.Instance.TriggerEvent(choice.triggerEvent);
            }
            
            // Move to next node
            currentNodeIndex = choice.nextDialogueIndex;
            currentLineIndex = 0;
            
            if (currentNodeIndex >= currentDialogue.nodes.Length)
            {
                EndDialogue();
            }
            else
            {
                ShowCurrentLine();
            }
        }
    }
    
    public void EndDialogue()
    {
        isDialogueActive = false;
        currentDialogue = null;
        onDialogueEnd?.Invoke();
        dialogueUI.Hide();
    }
}
