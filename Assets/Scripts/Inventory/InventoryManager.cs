using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[System.Serializable]
public class InventoryItem
{
    public string itemId;
    public string itemName;
    public string description;
    public Sprite icon;
    public bool isKeyItem = false;
}

public class InventoryManager : MonoBehaviour
{
    public static InventoryManager Instance { get; private set; }
    
    [Header("Inventory")]
    public List<InventoryItem> items = new List<InventoryItem>();
    public int maxSlots = 12;
    
    public System.Action onInventoryChanged;
    
    void Awake()
    {
        if (Instance == null) Instance = this;
    }
    
    public bool AddItem(InventoryItem item)
    {
        if (items.Count >= maxSlots) return false;
        
        items.Add(item);
        onInventoryChanged?.Invoke();
        Debug.Log($"Added item: {item.itemName}");
        return true;
    }
    
    public bool RemoveItem(string itemId)
    {
        InventoryItem item = items.Find(i => i.itemId == itemId);
        if (item != null)
        {
            items.Remove(item);
            onInventoryChanged?.Invoke();
            Debug.Log($"Removed item: {item.itemName}");
            return true;
        }
        return false;
    }
    
    public bool HasItem(string itemId)
    {
        return items.Exists(i => i.itemId == itemId);
    }
    
    public InventoryItem GetItem(string itemId)
    {
        return items.Find(i => i.itemId == itemId);
    }
}
