using System.Collections.Generic;
using UnityEngine;

public class EventManager : MonoBehaviour
{
    public static EventManager Instance { get; private set; }
    
    private Dictionary<string, System.Action> events = new Dictionary<string, System.Action>();
    
    void Awake()
    {
        if (Instance == null) Instance = this;
    }
    
    public void Subscribe(string eventName, System.Action callback)
    {
        if (!events.ContainsKey(eventName))
        {
            events[eventName] = null;
        }
        events[eventName] += callback;
    }
    
    public void Unsubscribe(string eventName, System.Action callback)
    {
        if (events.ContainsKey(eventName))
        {
            events[eventName] -= callback;
        }
    }
    
    public void TriggerEvent(string eventName)
    {
        if (events.ContainsKey(eventName) && events[eventName] != null)
        {
            Debug.Log($"Event triggered: {eventName}");
            events[eventName]?.Invoke();
        }
    }
}
