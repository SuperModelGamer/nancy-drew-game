using UnityEngine;
using UnityEngine.Events;

public class PointAndClickController : MonoBehaviour
{
    [Header("Settings")]
    public float clickDistance = 100f;
    public LayerMask interactableLayer;
    
    [Header("Events")]
    public UnityEvent<Vector3> onWorldClick;
    public UnityEvent<Interactable> onInteractableClick;
    
    void Update()
    {
        if (Input.GetMouseButtonDown(0))
        {
            HandleClick();
        }
    }
    
    void HandleClick()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);
        RaycastHit hit;
        
        if (Physics.Raycast(ray, out hit, clickDistance, interactableLayer))
        {
            Interactable interactable = hit.collider.GetComponent<Interactable>();
            if (interactable != null)
            {
                interactable.Interact();
                onInteractableClick?.Invoke(interactable);
                return;
            }
        }
        
        // Clicked on world
        if (Physics.Raycast(ray, out hit, clickDistance))
        {
            onWorldClick?.Invoke(hit.point);
        }
    }
}
