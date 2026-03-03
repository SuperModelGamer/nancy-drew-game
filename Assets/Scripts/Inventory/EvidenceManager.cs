using UnityEngine;
using System.Collections.Generic;

[System.Serializable]
public class Evidence
{
    public string evidenceId;
    public string evidenceName;
    public string description;
    public Sprite image;
    public bool isDiscovered = false;
    public string discoveredInScene;
}

public class EvidenceManager : MonoBehaviour
{
    public static EvidenceManager Instance { get; private set; }
    
    [Header("Evidence Database")]
    public List<Evidence> allEvidence = new List<Evidence>();
    
    public System.Action onEvidenceAdded;
    public SystemAction onAllEvidenceFound; // Note: UnityEvents use UnityAction, this is placeholder
    
    void Awake()
    {
        if (Instance == null) Instance = this;
    }
    
    public void DiscoverEvidence(string evidenceId)
    {
        Evidence evidence = allEvidence.Find(e => e.evidenceId == evidenceId);
        
        if (evidence != null && !evidence.isDiscovered)
        {
            evidence.isDiscovered = true;
            Debug.Log($"Evidence discovered: {evidence.evidenceName}");
            onEvidenceAdded?.Invoke();
        }
    }
    
    public bool HasEvidence(string evidenceId)
    {
        Evidence evidence = allEvidence.Find(e => e.evidenceId == evidenceId);
        return evidence != null && evidence.isDiscovered;
    }
    
    public List<Evidence> GetDiscoveredEvidence()
    {
        return allEvidence.FindAll(e => e.isDiscovered);
    }
    
    public int GetTotalEvidenceCount()
    {
        return allEvidence.Count;
    }
    
    public int GetDiscoveredCount()
    {
        return GetDiscoveredEvidence().Count;
    }
}
