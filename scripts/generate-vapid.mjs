import webpush from "web-push";
const keys = webpush.generateVAPIDKeys();
console.log("\nVITE_VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PUBLIC_KEY=" + keys.publicKey);
console.log("VAPID_PRIVATE_KEY=" + keys.privateKey + "\n");
console.log("Guarde a PRIVATE KEY somente nas Environment Variables da Vercel. Nunca coloque no GitHub.");
