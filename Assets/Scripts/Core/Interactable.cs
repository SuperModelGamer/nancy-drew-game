using UnityEngine;
using UnityEngine.Events;

public class Interactable : MonoBehaviour
{
    [Header("Interaction")]
    public string interactText = "Examine";
    public bool oneTimeInteraction = false;
    
    [Header("Events")]
    public UnityEvent onInteract;
    
    protected bool hasInteracted = false;
    
    public virtual void Interact()
    {
        if (oneTimeInteraction && hasInteracted) return;
        
        hasInteracted = true;
        onInteract?.Invoke();
        
        Debug.Log($"Interacted with: {gameObject.name}");
    }
    
    void OnMouseEnter()
    {
        // Show interaction cursor or highlight
    }
    
    void OnMouseExit()
    {
        // Hide interaction cursor
    }
}
