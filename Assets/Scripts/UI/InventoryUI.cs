using UnityEngine;
using UnityEngine.UI;
using TMPro;
using System.Collections.Generic;

public class InventoryUI : MonoBehaviour
{
    [Header("UI Elements")]
    public GameObject inventoryPanel;
    public Transform itemSlotContainer;
    public GameObject itemSlotPrefab;
    public TextMeshProUGUI itemDescriptionText;
    
    private List<InventoryItem> currentItems = new List<InventoryItem>();
    
    void Start()
    {
        if (InventoryManager.Instance != null)
        {
            InventoryManager.Instance.onInventoryChanged += RefreshInventory;
        }
        Hide();
    }
    
    void OnDestroy()
    {
        if (InventoryManager.Instance != null)
        {
            InventoryManager.Instance.onInventoryChanged -= RefreshInventory;
        }
    }
    
    public void Toggle()
    {
        if (inventoryPanel.activeSelf)
            Hide();
        else
            Show();
    }
    
    public void Show()
    {
        inventoryPanel.SetActive(true);
        RefreshInventory();
    }
    
    public void Hide()
    {
        inventoryPanel.SetActive(false);
    }
    
    void RefreshInventory()
    {
        // Clear old slots
        foreach (Transform child in itemSlotContainer)
        {
            Destroy(child.gameObject);
        }
        
        // Create new slots
        if (InventoryManager.Instance != null)
        {
            foreach (var item in InventoryManager.Instance.items)
            {
                GameObject slot = Instantiate(itemSlotPrefab, itemSlotContainer);
                slot.GetComponentInChildren<TextMeshProUGUI>().text = item.itemName;
                slot.GetComponent<Button>().onClick.AddListener(() => OnItemClicked(item));
            }
        }
    }
    
    void OnItemClicked(InventoryItem item)
    {
        itemDescriptionText.text = item.description;
    }
}
