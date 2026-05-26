const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

// --- CONFIGURATION ---
const START_TIME = Date.now();
const MAX_RUN_TIME = 5.5 * 60 * 60 * 1000; // 5h30 pour laisser le YAML nettoyer la RAM

const urls = [
    'https://www.uptoplay.net/runapk/create-androidapk.html?app=android_blank&apk=%2Fvar%2Fwww%2Fhtml%2Fweboffice%2Fmydata%2F23060005%2FNewDocuments%2F%2FDigiminer.apk',
    'https://www.uptoplay.net/runapk/create-androidapk.html?app=android_blank&apk=%2Fvar%2Fwww%2Fhtml%2Fweboffice%2Fmydata%2F23060006%2FNewDocuments%2F%2FDigiminer.apk'
];

(async () => {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--window-size=1280,800'
        ]
    });

    const runInstance = async (id, url) => {
        console.log(`[Instance ${id}] Initialisée.`);
        
        while (true) {
            // Vérification du temps restant : on ferme TOUT si dépassement
            if (Date.now() - START_TIME > MAX_RUN_TIME) {
                console.log(`[Instance ${id}] Limite de temps atteinte. Fermeture complète.`);
                await browser.close(); // Ferme le navigateur et libère la RAM
                process.exit(0);       // Rend la main au YAML pour le pkill
            }

            let context;
            try {
                context = await browser.createBrowserContext();
                const page = await context.newPage();
                
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

                console.log(`[Instance ${id}] --- ${new Date().toLocaleTimeString()} : Navigation ---`);
                await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

                await new Promise(r => setTimeout(r, 10000));

                const clickAction = async () => {
                    return await page.evaluate(() => {
                        const search = (doc) => {
                            const btn = doc.querySelector('#talpa-splash-button');
                            if (btn) { btn.click(); return true; }
                            const frames = doc.querySelectorAll('iframe');
                            for (let f of frames) {
                                try { if (search(f.contentWindow.document)) return true; } catch (e) {}
                            }
                            return false;
                        };
                        return search(document);
                    });
                };

                let ok1 = await clickAction();
                if (ok1) {
                    console.log(`[Instance ${id}] Premier clic réussi.`);
                    await new Promise(r => setTimeout(r, 10000));
                    await clickAction();
                    console.log(`[Instance ${id}] Deuxième clic réussi. Session active (15min).`);
                    await new Promise(r => setTimeout(r, 15 * 60 * 1000));
                } else {
                    console.log(`[Instance ${id}] Bouton introuvable. Nouvel essai dans 1 min.`);
                    await new Promise(r => setTimeout(r, 60000));
                }

            } catch (err) {
                console.error(`[Instance ${id}] Erreur: ${err.message}`);
                await new Promise(r => setTimeout(r, 30000));
            } finally {
                if (context) await context.close();
            }
        }
    };

    // Lancement parallèle avec un décalage de 30 secondes entre chaque démarrage
    for (let i = 0; i < urls.length; i++) {
        runInstance(i + 1, urls[i]);
        console.log(`Attente de 30s avant de lancer le lien suivant...`);
        await new Promise(r => setTimeout(r, 30000)); 
    }
})();
