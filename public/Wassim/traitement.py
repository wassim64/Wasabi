from flask import Flask, jsonify
from flask_cors import CORS
from collections import defaultdict
import json
import ijson

app = Flask(__name__)
CORS(app) 

def process_choropleth_data():
    json_file_path = '../json/album.json'
    genre_by_country = defaultdict(lambda: defaultdict(int))

    print(f"Démarrage fonction")

    with open(json_file_path, 'r', encoding='utf-8') as file:
        print(f"[INFO] Ouverture du fichier {json_file_path} réussie.")
        
        i = 0
        for obj in ijson.items(file, 'item'):
            if i < 900:
                country = obj.get('country')
                genre = obj.get('genre')
                print(country)
                print(genre)
                print(f"[DEBUG] Traitement de l'enregistrement {i + 1}: Country = {country}, Genre = {genre}")
 

                if country and genre:
                    genre_by_country[country][genre] += 1
                i += 1
            else:
                print(f"[INFO] Limite de traitement atteinte (900 enregistrements)")
                break


    # Log pour vérifier que le dictionnaire est bien rempli
    print(f"[INFO] Traitement terminé. Nombre de pays traités: {len(genre_by_country)}")
 
    return genre_by_country

@app.route('/choropleth-data', methods=['GET'])
def get_choropleth_data():
    print("[INFO] Requête reçue sur /choropleth-data")
    data = process_choropleth_data()

    if data:
        print(f"[INFO] Données prêtes à être envoyées. Nombre de pays : {len(data)}")
    else:
        print("[WARNING] Aucune donnée à retourner.")
    
    return jsonify(data)

if __name__ == '__main__':
    print("[INFO] Démarrage du serveur Flask...")
    app.run(debug=True)