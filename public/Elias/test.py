import json

def convertir_minuscule(d):
    """Convertit récursivement toutes les clés et valeurs de type chaîne en minuscules."""
    if isinstance(d, dict):
        return {k.lower(): convertir_minuscule(v) for k, v in d.items()}
    elif isinstance(d, list):
        return [convertir_minuscule(i) for i in d]
    elif isinstance(d, str):
        return d.lower()
    else:
        return d

def transformer_fichier_json(fichier_entree, fichier_sortie):
    with open(fichier_entree, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    data_minuscule = convertir_minuscule(data)
    
    with open(fichier_sortie, 'w', encoding='utf-8') as f:
        json.dump(data_minuscule, f, ensure_ascii=False, indent=4)

# Exemple d'utilisation
transformer_fichier_json('result.json', 'sous-genre.json')