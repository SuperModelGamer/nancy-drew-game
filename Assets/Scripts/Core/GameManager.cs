using UnityEngine;

public class GameManager : MonoBehaviour
{
    public static GameManager Instance { get; private set; }
    
    [Header("Game State")]
    public GameState currentState = GameState.Playing;
    public int currentChapter = 1;
    
    [Header("Player Data")]
    public string playerName = "Nancy";
    
    void Awake()
    {
        if (Instance == null)
        {
            Instance = this;
            DontDestroyOnLoad(gameObject);
        }
        else
        {
            Destroy(gameObject);
        }
    }
    
    void Start()
    {
        Debug.Log("Nancy Drew Mystery - Chapter " + currentChapter);
    }
}

public enum GameState
{
    Playing,
    Dialog,
    Puzzle,
    Menu,
    Loading
}
