using UnityEngine;

public enum GameMode
{
    PointAndClick,
    Dialogue,
    Puzzle,
    Inventory,
    Menu,
    Cutscene
}

public class GameStateMachine : MonoBehaviour
{
    public static GameStateMachine Instance { get; private set; }
    
    [Header("State")]
    public GameMode currentMode = GameMode.PointAndClick;
    public GameMode previousMode;
    
    void Awake()
    {
        if (Instance == null) Instance = this;
    }
    
    public void SwitchMode(GameMode newMode)
    {
        if (currentMode == newMode) return;
        
        Debug.Log($"Switching mode: {currentMode} -> {newMode}");
        
        previousMode = currentMode;
        currentMode = newMode;
        
        // Handle mode-specific setup
        switch (newMode)
        {
            case GameMode.PointAndClick:
                EnablePointAndClick();
                break;
            case GameMode.Dialogue:
                EnableDialogue();
                break;
            case GameMode.Puzzle:
                EnablePuzzle();
                break;
            case GameMode.Inventory:
                EnableInventory();
                break;
            case GameMode.Menu:
                EnableMenu();
                break;
            case GameMode.Cutscene:
                EnableCutscene();
                break;
        }
    }
    
    public void ReturnToPreviousMode()
    {
        SwitchMode(previousMode);
    }
    
    void EnablePointAndClick()
    {
        // Enable player movement, enable click detection
    }
    
    void EnableDialogue()
    {
        // Pause player, show dialogue UI
    }
    
    void EnablePuzzle()
    {
        // Show puzzle UI
    }
    
    void EnableInventory()
    {
        // Show inventory UI
    }
    
    void EnableMenu()
    {
        // Show pause menu
    }
    
    void EnableCutscene()
    {
        // Disable player control, play animation
    }
}
