using UnityEngine;
using System.Collections.Generic;
using System;

[System.Serializable]
public class GameSaveData
{
    public string saveName;
    public DateTime saveTime;
    public int currentChapter;
    public string currentSceneId;
    public List<string> discoveredEvidence = new List<string>();
    public List<string> collectedItems = new List<string>();
    public List<string> solvedPuzzles = new List<string>();
    public Dictionary<string, bool> flags = new Dictionary<string, bool>();
}

public class SaveManager : MonoBehaviour
{
    public static SaveManager Instance { get; private set; }
    
    [Header("Save Settings")]
    public string saveFolder = "Saves";
    public int maxSaves = 10;
    
    private string savePath;
    
    void Awake()
    {
        if (Instance == null) Instance = this;
        savePath = Application.persistentDataPath + "/" + saveFolder;
        
        if (!System.IO.Directory.Exists(savePath))
        {
            System.IO.Directory.CreateDirectory(savePath);
        }
    }
    
    public void SaveGame(string saveName)
    {
        GameSaveData data = new GameSaveData();
        data.saveName = saveName;
        data.saveTime = DateTime.Now;
        
        // Save current game state
        if (GameManager.Instance != null)
        {
            data.currentChapter = GameManager.Instance.currentChapter;
        }
        
        if (SceneManager.Instance != null)
        {
            data.currentSceneId = SceneManager.Instance.currentSceneId;
        }
        
        if (EvidenceManager.Instance != null)
        {
            foreach (var evidence in EvidenceManager.Instance.GetDiscoveredEvidence())
            {
                data.discoveredEvidence.Add(evidence.evidenceId);
            }
        }
        
        if (InventoryManager.Instance != null)
        {
            foreach (var item in InventoryManager.Instance.items)
            {
                data.collectedItems.Add(item.itemId);
            }
        }
        
        string json = JsonUtility.ToJson(data, true);
        string filePath = savePath + "/" + SanitizeFileName(saveName) + ".json";
        System.IO.File.WriteAllText(filePath, json);
        
        Debug.Log($"Game saved: {saveName}");
    }
    
    public bool LoadGame(string saveName)
    {
        string filePath = savePath + "/" + SanitizeFileName(saveName) + ".json";
        
        if (!System.IO.File.Exists(filePath))
        {
            Debug.LogError($"Save file not found: {saveName}");
            return false;
        }
        
        string json = System.IO.File.ReadAllText(filePath);
        GameSaveData data = JsonUtility.FromJson<GameSaveData>(json);
        
        // Restore game state
        if (GameManager.Instance != null)
        {
            GameManager.Instance.currentChapter = data.currentChapter;
        }
        
        if (SceneManager.Instance != null && !string.IsNullOrEmpty(data.currentSceneId))
        {
            SceneManager.Instance.LoadScene(data.currentSceneId);
        }
        
        Debug.Log($"Game loaded: {saveName}");
        return true;
    }
    
    public string[] GetSaveFiles()
    {
        string[] files = System.IO.Directory.GetFiles(savePath, "*.json");
        string[] saveNames = new string[files.Length];
        
        for (int i = 0; i < files.Length; i++)
        {
            saveNames[i] = System.IO.Path.GetFileNameWithoutExtension(files[i]);
        }
        
        return saveNames;
    }
    
    public void DeleteSave(string saveName)
    {
        string filePath = savePath + "/" + SanitizeFileName(saveName) + ".json";
        if (System.IO.File.Exists(filePath))
        {
            System.IO.File.Delete(filePath);
        }
    }
    
    string SanitizeFileName(string filename)
    {
        foreach (char c in System.IO.Path.GetInvalidFileNameChars())
        {
            filename = filename.Replace(c, '_');
        }
        return filename;
    }
}
