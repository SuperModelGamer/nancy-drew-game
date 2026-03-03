using UnityEngine;
using UnityEngine.Events;
using System.Collections;

public enum PuzzleType
{
    Code,
    Lock,
    Sequence,
    Slider,
    Combination
}

[System.Serializable]
public class PuzzleClue
{
    public string clueId;
    public string clueText;
}

public class Puzzle : MonoBehaviour
{
    [Header("Puzzle Info")]
    public string puzzleId;
    public PuzzleType puzzleType;
    public string puzzleName;
    [TextArea(3, 10)]
    public string puzzleDescription;
    
    [Header("Solution")]
    public string correctAnswer;
    public bool isSolved = false;
    
    [Header("Clues")]
    public PuzzleClue[] clues;
    
    [Header("Events")]
    public UnityEvent onPuzzleSolved;
    public UnityEvent onPuzzleFailed;
    
    public bool CheckAnswer(string answer)
    {
        if (isSolved) return true;
        
        if (answer.Trim().ToLower() == correctAnswer.Trim().ToLower())
        {
            isSolved = true;
            onPuzzleSolved?.Invoke();
            Debug.Log($"Puzzle solved: {puzzleName}");
            return true;
        }
        else
        {
            onPuzzleFailed?.Invoke();
            Debug.Log($"Puzzle failed: {puzzleName}");
            return false;
        }
    }
    
    public string GetClue(int index)
    {
        if (clues != null && index < clues.Length)
        {
            return clues[index].clueText;
        }
        return "";
    }
}
