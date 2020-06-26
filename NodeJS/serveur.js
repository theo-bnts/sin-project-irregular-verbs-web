let express = require('express');                                                          //importation du module express pour les templates html
let app = express()
let server = require('http').createServer(app)                                              //créer un seveur quand module http importé
let io = require('socket.io').listen(server)                                                //importation socket.io pour recevoir les réponses du client
let mysql = require('mysql')                                                                //importation du module mysql pour la connexion à la base de données
let fs = require('fs')                                                                      //importation fs pour lire les fichier                      //importation du fichier statique css                                                                    //liste pour stocker les verbes utilisés

//stockage de toutes les informations sur la partie sous la forme json
let profilUser;


app.use(express.static('public'));

app.get('/', function(req, res) {                                                           //page d'acceuil
    res.render('game.ejs');
})

app.get('/result/', function(req, res) {
    //console.log(profilUser)
    res.render('resultat.ejs', { resultatsUser: profilUser} );
})

io.sockets.on('connection', function(socket) {                                              //evenement si il y a une connexion
    console.log('Un client est connecté')                                                   //afficher "Un client est connecté" dans la console
    profilUser = {
        pseudo : "None",
        tour : 0,
        verbManquant : "Default",
        reponse : [],
        reponsePos : [],
        correction : [],
        idVerbs : [],
        currentVerbs : {
            infinitif: "",
            preterit: "",
            participe: "",
            traduction: ""
        },
        annulerVerb: false
    }

    socket.on('pseudo', function(pseudo) {                                                  //quand serveur actif et pseudo recu, recuperer pseudo
        profilUser.pseudo = pseudo                                                          //on récupere le contenu de pseudo et on le stocke dans le json
        console.log(`Le joueur ${pseudo} va commencer une game !`)                          //On affiche un message dans la console
    })
    
    socket.on('newVerif', function(result) {                                                //quand serveur actif et newVerif recu
        console.log(`New Verif`)                                                            //on affiche un message dans la console
    })

    socket.on('getProfil', function() {
        socket.emit('getProfil', profilUser)
    })
    socket.on('refreshProfil', function(profilUsed) {
        profilUser = profilUsed
    })

    socket.on('requestVerb', function(v) {
        let sqlClient = mysql.createPool({                                                  //identifiant de la base de données mysql
            database: 'admin_irregular',
            host: "51.178.47.19",
            user: "admin_mrdevos",
            password: "4R4kMGuRJR"
        })
        sqlClient.getConnection(function(err) {                                             //connexion à la base de données
            if(err) throw err;                                                                 //si on a une erreur de connexion, l'afficher
            //console.log(v)
            for(let i=0; i<v.length;i++) {                                                 
                sqlClient.query(`SELECT * FROM list WHERE id="${v[i]}"`, (err, result) => { //sélection de la table list, sélection de la ligne du verbe choisi
                    if(err) throw err;                                                          //si on a une erreur de connexion, l'afficher
                    if(result.length > 0) {
                        let reponseToPush = {
                            id: v[i],
                            infinitif: result[0].infinitif,
                            preterit: result[0].preterit,   
                            participe: result[0].participe,  
                            traduction: result[0].traduction
                        }
                        socket.emit('verbe', reponseToPush)
                    } else {
                        console.log('Pas trouvé !')
                    }
                })
            }
        })

    })

    socket.on('reloadVerbs', function(profilUsed) {                                             //quand serveur actif et reloadVerb recu, recuperer result
        profilUser = profilUsed
        if(!profilUser.tour < 9) {
            console.log("On lance le reload des verbes")                                        //on affiche un message dans la console
            newVerb()                                                                           //on execute la fonction newVerbs
            if(profilUser.annulerVerb == true) { profilUser.idVerbs.pop() }                                  //On supprime le verb si c'est un rechargement
                                                                          
            let sqlClient = mysql.createPool({                                                  //identifiant de la base de données mysql
                database: 'admin_irregular',
                host: "51.178.47.19",
                user: "admin_mrdevos",
                password: "4R4kMGuRJR"
            })                                                                                  //execution de la fonction "newVerb"
            sqlClient.getConnection(function(err) {                                             //connexion à la base de données
                if(err) throw err;                                                              //si on a une erreur de connexion, l'afficher
                sqlClient.query(`SELECT * FROM list WHERE id="${profilUser.idVerbs[0]}"`, (err, result) => { //sélection de la table list, sélection de la ligne du verbe choisi
                    if(err) throw err;                                                          //si on a une erreur de connexion, l'afficher
                    if(result.length > 0) {                                                     //si on trouve le contenu de la ligne
                        profilUser.currentVerbs.infinitif = result[0].infinitif                 //on recupere le contenu de la cellule infinitif et on stocke dans le json
                        profilUser.currentVerbs.preterit = result[0].preterit                   //on recupere le contenu de la cellule preterit et on stocke dans le json
                        profilUser.currentVerbs.participe = result[0].participe                 //on recupere le contenu de la cellule participe et on stocke dans le json
                        profilUser.currentVerbs.traduction = result[0].traduction               //on recupere le contenu de la cellule traduction et on stocke dans le json
                        socket.emit('nouveauVerbes', profilUser)                                //on emet 'nouveauVerbes' on transmet le contenu de profilUser
                    } else {                                                                    //si on ne trouve pas le contenu de la ligne
                        console.log('Pas de resultat')                                          //afficher "Pas de résultat" dans la console
                    }                                   
                })
            })
        }
    })
})

app.use(function(req, res, next) {
    res.setHeader('Content-Type', 'text/plain')                                             //page avec type text
    res.status(404).send('Pas de page de ce nom')                                           //retourner une erreur 404 (pas de page correspondante) avec le message 'Pas de page de ce nom'
})
                                                                         //on écoute le port 8080
server.listen(8080)


function newVerb() {                                                                        
    let randomVerb = Math.floor(Math.random() * (65 - 1 + 1)) + 1                           //on choisi la ligne à afficher 
    if(profilUser.idVerbs.indexOf(randomVerb) != -1) return newVerb()                       //on vérifie si le verbe est déjà passé, si c'est le cas on relance
    profilUser.idVerbs.unshift(randomVerb)                                                  //on ajoute le verbe dans la liste des verbes tirés
}