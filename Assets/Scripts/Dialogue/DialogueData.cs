using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class DialogueLine
{
    public string speakerName;
    [TextArea(3, 10)]
    public string text;
    public AudioClip voiceLine;
}

[System.Serializable]
public class DialogueChoice
{
    public string choiceText;
    public int nextDialogueIndex;
    public string triggerEvent; // e.g., "get_key", "unlock_door"
}

[System.Serializable]
public class DialogueNode
{
    public int nodeId;
    public DialogueLine[] lines;
    public DialogueChoice[] choices;
    public bool isEndNode = false;
}

[CreateAssetMenu(fileName = "New Dialogue", menuName = "Nancy Drew/Dialogue")]
public class DialogueData : ScriptableObject
{
    public string dialogueName;
    public DialogueNode[] nodes;
}
