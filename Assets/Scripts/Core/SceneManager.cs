using UnityEngine;
using System.Collections.Generic;

[System.Serializable]
public class Scene
{
    public string sceneId;
    public string sceneName;
    public string sceneDescription;
    public Sprite backgroundImage;
    public SceneObject[] objects;
    public string[] connectedScenes;
}

[System.Serializable]
public class SceneObject
{
    public string objectId;
    public string objectName;
    public Vector2 position;
    public Vector2 size;
    public string interactableId; // Links to an Interactable in the scene
    public bool isVisible = true;
}

public class SceneManager : MonoBehaviour
{
    public static SceneManager Instance { get; private set; }
    
    [Header("Scene Database")]
    public Scene[] scenes;
    
    [Header("Current State")]
    public string currentSceneId;
    public Scene currentScene;
    
    void Awake()
    {
        if (Instance == null) Instance = this;
    }
    
    public void LoadScene(string sceneId)
    {
        Scene scene = System.Array.Find(scenes, s => s.sceneId == sceneId);
        
        if (scene != null)
        {
            currentSceneId = sceneId;
            currentScene = scene;
            Debug.Log($"Loaded scene: {scene.sceneName}");
            // Here you'd load the background, objects, etc.
        }
        else
        {
            Debug.LogError($"Scene not found: {sceneId}");
        }
    }
    
    public Scene GetScene(string sceneId)
    {
        return System.Array.Find(scenes, s => s.sceneId == sceneId);
    }
    
    public string[] GetConnectedScenes(string sceneId)
    {
        Scene scene = GetScene(sceneId);
        return scene != null ? scene.connectedScenes : new string[0];
    }
}
