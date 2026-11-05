# Canvas AI कनेक्टर

[English](../README.md) · [简体中文](README.zh-CN.md) · [Español](README.es.md) · [日本語](README.ja.md) · **हिन्दी**

**Claude** (वेब, डेस्कटॉप, मोबाइल, Claude Code) या **ChatGPT** को अपना Canvas पढ़ने दें — सामान्य चैट में, सिर्फ़ कोडिंग टूल में नहीं।

> "इस हफ़्ते क्या जमा करना है?" · "MATH 132 का लेक्चर 5 संक्षेप में बताओ।" · "HW 3 पर क्या फ़ीडबैक मिला?" · "कोई नई घोषणा?"

UMass Amherst के छात्रों के लिए लिखा गया और UMass Amherst Canvas पर परखा गया। Canvas इस्तेमाल करने वाले किसी भी संस्थान में काम करना चाहिए — बस एक लाइन बदलनी है।

- **केवल पढ़ना।** 58 टूल, सभी तय `GET` अनुरोध। यह कभी असाइनमेंट जमा नहीं करता, संदेश नहीं भेजता, कुछ नहीं बदलता।
- **सिर्फ़ आपका।** यह आपके अपने मुफ़्त Cloudflare खाते पर चलता है और आपके Canvas खाते से बंध जाता है।
- **असली फ़ाइलें पढ़ता है।** PDF, Word, PowerPoint, Excel — हाथ से लिखे या स्कैन किए नोट्स भी (AI पन्नों को चित्र की तरह देखता है)।
- **AI सेटअप करता है।** यह फ़ोल्डर Claude Code (या Codex) में खोलें और कहें *"Canvas कनेक्टर सेट अप करो"*।

## यह कैसे काम करता है

```
Claude / ChatGPT  ──OAuth──▶  आपका Cloudflare Worker  ──केवल-पढ़ने वाला API──▶  आपके संस्थान का Canvas
                               (यह रिपॉज़िटरी; आपका Canvas टोकन एन्क्रिप्ट करके रखती है)
```

## सेटअप (लगभग 10 मिनट; सुझाव: AI से करवाएँ)

ज़रूरत: Canvas खाता, मुफ़्त [Cloudflare खाता](https://dash.cloudflare.com/sign-up), [Node.js 20+](https://nodejs.org), और Claude Code (या Codex)।

```bash
git clone https://github.com/BloodyReginaa/canvas-ai-connector.git
cd canvas-ai-connector
claude
```

फिर कहें: **"Canvas कनेक्टर सेट अप करने में मदद करो।"** यह [`SKILL.md`](../.claude/skills/canvas-connector-setup/SKILL.md) के अनुसार चलता है: आपकी मशीन जाँचता है, आपका संस्थान सेट करता है, Cloudflare में लॉग इन करवाता है (Allow आप दबाते हैं), डिप्लॉय करता है और जोड़ने में मदद करता है। यह कभी आपका Canvas टोकन नहीं माँगेगा।

<details><summary><b>मैन्युअल सेटअप</b></summary>

1. `npm install && npm test`
2. `config.mjs` बदलें: `CANVAS_HOST` (जैसे `umamherst.instructure.com`), `SCHOOL_NAME`, `ACCENT_COLOR`।
3. `npx wrangler login`
4. `npx wrangler kv namespace create OAUTH_KV` → मिली id को `wrangler.jsonc` में डालें।
5. `npx wrangler deploy` → `https://canvas-ai-connector.<आप>.workers.dev` नोट करें।
6. तुरंत जोड़ें (सबसे पहले अधिकृत करने वाला Canvas खाता स्वामी बनता है)।
</details>

## जोड़ना

1. **Canvas टोकन बनाएँ:** Canvas → Account → Settings → **+ New Access Token**। UMass Amherst में अधिकतम अवधि **30 दिन** है। तुरंत कॉपी करें — यह केवल एक बार दिखता है।
2. **Claude:** Settings → Connectors → **Add custom connector** → URL `https://…workers.dev/mcp` → Connect → खुले पेज पर टोकन चिपकाएँ → Authorize।
3. **ChatGPT:** डेवलपर मोड में उसी URL से कस्टम कनेक्टर जोड़ें।
4. नई चैट में पूछें *"इस हफ़्ते मेरे कौन-से असाइनमेंट हैं?"*

**टोकन समाप्त होने पर:** नया टोकन बनाएँ, कनेक्टर को Disconnect → Connect करें और चिपकाएँ। दोबारा डिप्लॉय की ज़रूरत नहीं।

## गोपनीयता और सुरक्षा

- टोकन केवल आपके Worker और आपके संस्थान के Canvas को जाता है; आपके Cloudflare KV में एन्क्रिप्ट होकर रहता है। कोई और (लेखक भी) इसे नहीं देख सकता।
- Worker पहले अधिकृत करने वाले Canvas खाते से बंध जाता है; बाकी खाते अस्वीकार होते हैं।
- केवल Claude, ChatGPT और लोकल क्लाइंट OAuth पूरा कर सकते हैं।
- कोर्स सामग्री को अविश्वसनीय डेटा माना जाता है, निर्देश नहीं।
- डाउनलोड आकार-सीमित (15 MiB), केवल HTTPS, और निजी नेटवर्क से अवरुद्ध हैं।
- Canvas आपकी अपनी अनुमतियाँ लागू करता है — आप वही पढ़ सकते हैं जो पहले से देख सकते हैं।

इस्तेमाल से पहले व्यक्तिगत टोकन और थर्ड-पार्टी टूल पर अपने संस्थान की नीति देखें।

## सीमाएँ

- 15 MiB से बड़ी फ़ाइलें कनेक्टर से नहीं पढ़ी जा सकतीं; उन्हें डाउनलोड करके लोकल Claude Code से खोलें।
- Gradescope, WebAssign, बाहरी साइटें, लॉक सामग्री और New Quizzes का आंतरिक डेटा पहुँच से बाहर है।
- कुछ कोर्स Files/Quizzes पेज छिपाते हैं (403/404); Modules से जुड़ी चीज़ें आमतौर पर फिर भी पढ़ी जाती हैं।

## डेवलपमेंट

`npm test` · `npm run check` · `npx wrangler deploy`। UI टेक्स्ट `i18n.mjs` में है। कोड का नक्शा [`AGENTS.md`](../AGENTS.md) में।

AI कोडिंग सहायकों की मदद से बनाया गया। MIT लाइसेंस।
