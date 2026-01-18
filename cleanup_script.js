const fs = require('fs');
const path = require('path');

const rawData = `name,code,category,retail_price,cost_price,description HIK HD-TVI 4Ch Hi-Res DVR 4 Cam Base Kit,SP150-5,Surveillance,3422.00,2395.00, HIK HD-TVI 8Ch Hi-Res DVR 8 Cam Base Kit,SP151-5,Surveillance,4336.00,3252.00, HIK HD-TVI 16Ch HiResDVR 16 Cam Base Kit,SP152-5,Surveillance,7962.00,5971.00, HD-TVI Bullet 2MP CV PIR 2.8mm,CC376-8,Surveillance,1625.00,1107.00,DS-2CE12DF3T-PIRXOS(2.8mm)(O-S HD-TVI Bullet 2MP HL Audio 2.8mm,CC376-13,Surveillance,525.00,359.00,DS-2CE16D0T-LPFS(2.8mm)(O-STD) HD-TVI Bullet 2MP CV HL 20m 2.8mm,CC376-15,Surveillance,1001.00,686.00,DS-2CE10DF3T-LPFS 2.8mm HD-TVI Bullet 2MP CV HL IR20m 2.8mm,CC376-16,Surveillance,703.00,485.00,DS-2CE10DF0T-LFS(2.8mm)(O-STD) HD-TVI Bullet 2MP CV HL 40m 2.8mm,CC376-17,Surveillance,1163.00,788.00,DS-2CE12DF3T-LFS(2.8mm)(O-STD) HD-TVI Bullet 2MP IR 40m VF,CC379,Surveillance,1093.00,749.00,DS-2CE19D0T-VFIT3F(2.7-13.5mm) HD-TVI Bullet 3K CV HL Audio 2.8mm,CC268-2,Surveillance,912.00,677.00,DS-2CE10KF0T-LFS (2.8mm)(O-STD HD-TVI Bullet 3K CV HL Audio 2.8mm,CC268-3,Surveillance,1220.00,835.00,DS-2CE12KF0T-LFS(2.8mm) HD-TVI Bullet 5MP EXIR IR40m MVF,CC268-4,Surveillance,1691.00,1159.00,DS-2CE19H0T-AIT3ZF HD-TVI Bullet 3K HL Audio 2.8mm,CC268-5,Surveillance,711.00,480.00,NEW DS-2CE16K0T-LFS(2.8mm)(O-STD) HD-TVI Dome 2MP CV HL IR20m 2.8mm,CC386-15,Surveillance,699.00,482.00,DS-2CE70DF0T-LMFS(2.8mm)(O-STD HD-TVI Dome 2MP IR20m 2.8mm,CC386-16,Surveillance,332.00,227.00,DS-2CE76D0T-EXIMF 2.8mm HD-TVI Dome 2MP HL 20m 2.8mm IP67,CC386-17,Surveillance,515.00,355.00,DS-2CE76D0T-LMFS(2.8mm)(O-STD) HD-TVI Dome 2MP HL 40m Audio 2.8mm,CC386-18,Surveillance,720.00,493.00,DS-2CE78D0T-LTS(2.8mm)(O-STD) HD-TVI Dome 2MP CV 40m Audio 2.8mm,CC386-19,Surveillance,1165.00,798.00,DS-2CE72DF3T-LXTS(2.8mm)(O-STD HD-TVI Dome 2MP EXIR 30m 3.6mm,CC387-1,Surveillance,709.00,489.00,DS-2CE76D3T-ITMF HD-TVI Turret 2MP IR 40m VF,CC388-2,Surveillance,1089.00,745.00,DS-2CE79D0T-VFIT3F (2.7-13.5mm HD-TVI Dome 5MP EXIR IR60m MVF,CC269-1,Surveillance,2356.00,1614.00,DS-2CE56H8T-AITZF HD-TVI Dome 3K HL Audio 2.8mm,CC269-2,Surveillance,771.00,528.00,DS-2CE78K0T-LFS(2.8mm) HD-TVI Dome 3K HL Audio 2.8mm,CC269-3,Surveillance,751.00,499.00,DS-2CE76K0T-LMFS(2.8mm) Analogue PTZ Keyboard Controller,CC95-1,Surveillance,5088.00,3476.00,DS-1006KI BRKT PTZ Pendant Mnt CC99/CC99-1,CC468-2,Surveillance,524.00,358.00,DS-1662ZJ BRKT PTZ Corner Mount White,CC468-3,Surveillance,658.00,445.00,DS-1602ZJ-CORNER BRKT PTZ Pole Mount White,CC468-4,Surveillance,658.00,451.00,DS-1602ZJ-Pole BRKT Compact PTZ Wall Mount White,CC468-5,Surveillance,445.00,305.00,DS-1602ZJ BRKT Speed Dome EI Coupling Ring,CC468-10,Surveillance,100.00,68.00, NVR 8Ch 80Mbps 8PoE incl 4TBHDD,CD70-6,Surveillance,8402.00,5740.00,DS-7608NXI-K2/8P + HDD NVR 8Ch 80Mbps No PoE,CD71-4,Surveillance,3136.00,2149.00,DS-7608NXI-K2 NVR 16Ch 160Mbps No PoE,CD72-4,Surveillance,3587.00,2449.00,DS-7616NXI-K2(D) NVR 16Ch 160Mbps No PoE,CD75,Surveillance,6963.00,4757.00,DS-7616NXI-I2/S NVR 16Ch 160Mbps 16PoE,CD76-9,Surveillance,7169.00,4887.00,DS-7616NXI-K2/16P NVR 16Ch 160Mbps 16 PoE Eco,CD76-10,Surveillance,5852.00,3998.00,EOL DS-7616NI-Q2/16P(STD)(D) NVR 16Ch 256Mbps AS No PoE 4FAF,CD90,Surveillance,11638.00,7998.00,DS-7716NXI-I4/S(STD)(E) NVR 16Ch 256Mbps AS 16PoE 4FAF,CD92,Surveillance,15152.00,10352.00,DS-7716NXI-I4/16P/S(STD)(E) NVR 16Ch 320Mbps DeepInMind No PoE,CD94,Surveillance,50029.00,34182.14,iDS-9616NXI-I8/X NVR 32CH 256Mbps with No PoE no HDD,CD73-6,Surveillance,8783.00,6020.00,DS-7632NXI-K2 NVR 32Ch 320Mbps AS No PoE 8SATA,CD74,Surveillance,26802.00,18493.00,DS-9632NXI-I8/S(STD)(E) NVR 32Ch 256Mbps AS No PoE 4FAF,CD91,Surveillance,13366.00,9222.00,DS-7732NXI-I4/S(STD)(E) NVR 32Ch 256Mbps AS 16PoE 4FAF,CD93,Surveillance,18294.00,12499.00,DS-7732NXI-I4/16P/S NVR 32Ch 320Mbps DeepInMind No PoE,CD95-4,Surveillance,51210.00,35095.00,New iDS-9632NXI-M8/X(STD) NVR 64Ch 320Mbps AS No PoE 8SATA,CD77,Surveillance,37499.00,25874.00,DS-9664NXI-I8/S(STD)(E) NVR 64CH 400Mbps No PoE,CD77-3,Surveillance,22677.00,15529.00,New DS-7764NI-M4(STD) NVR 64CH 400Mbps DeepInMind X No PoE,CD95-5,Surveillance,69011.00,47617.00,On Request iDS-9664NXI-M8/X(STD) General Purpose Server (3000ch max),CDC999-HC2,Surveillance,99892.52,68515.79,On Request DS-VE11D-C/HW01 iVMS 9000NI Server S16R,CDC999-S16R,Surveillance,250886.00,173111.00,New iVMS-9000NI-S16R/C1000(STD) HikCentral Management Server 300 Channel,CDC300-HC2,Surveillance,271366.00,185999.00,New HikCentral-P-VER/HW1D/300 IP Bullet 4MP HL IR 30m 2.8mm,CC400-6,Surveillance,1935.00,1310.00,DS-2CD2041G0-LIU(2.8mm)(South IP Bullet 2MP HL IR 30m 2.8mm,CC400-8,Surveillance,1765.00,1208.00,DS-2CD2021G0-LIU(2.8mm)(South IP Bullet 2MP WIFI IR30m 2.8mm,CC400-W,Surveillance,1192.00,821.97,DS-2CV2021G2-IDW(2.8mm)(W)(O-S IP Bullet 2MP EIP1.0 HL MVF,CC401-4,Surveillance,3727.00,2571.00,New DS-2CD2621G0-LIZSU IP Bullet 4MP EIP1.0 HL MVF,CC401-7,Surveillance,3880.00,2659.00,New DS-2CD2641G0-LIZSU(2.8-12mm)So IP Bullet 4MP AS SS IR60m 6mm,CC409-5TAS,Surveillance,3612.00,2472.00,DS-2CD2T46G2-ISU/SL 6mm IP Bullet 4MP AcuSense IR 60m MVF Black,CC410-5B,Surveillance,5504.00,3760.00,DS-2CD2646G2-IZS (Black) IP Bullet 4MP AcuSense IR 60m MVF,CC410-7,Surveillance,6032.00,4162.00,DS-2CD2646G2HT-IZS 2.8-12mm eF IP Bullet 4MP CV HL60m 2.8-12mm,CC410-8,Surveillance,7577.00,5186.00,DS-2CD2647G3T-LIZSY(2.8-12mm)( IP Bullet 4MP AS IR30m 2.8mm,CC406,Surveillance,3341.00,2287.00,DS-2CD2046G2H-I2U/SL (2.8mm) IP Bullet 4MP AS IR60m 6mm,CC406-1,Surveillance,3089.00,2110.00,DS-2CD2T46G2-2I 6mm IP Bullet 4MP AS IR80m 6mm,CC406-2,Surveillance,3474.00,2339.00,DS-2CD2T46G2-4I(6mm)(C)(O-STD) IP Bullet 8MP AS EXIR 80m 6mm,CC406-12,Surveillance,4732.00,3232.80,DS-2CD2T86G2-4I(6mm)(C)(O-STD) IP Bullet 4MP CV AS SS WL 40m 2.8mm,CC406-25TAS,Surveillance,3703.00,2545.00,DS-2CD2047G2H-LIU/SL(2.8mm)(eF IP Bullet 8MP CV HL 40m 2.8mm,CC406-26,Surveillance,4622.00,3189.00,On Request DS-2CD2087G2H-LI(2.8mm)(eF IP Bullet 8MP CV AS SS WL 40m 2.8mm,CC406-26TAS,Surveillance,4810.00,3306.00,New DS-2CD2087G2H-LIU/SL(2.8mm)(eF IP Bullet 4MP CV AS SS WL 40m 4mm,CC406-27TAS,Surveillance,4638.00,3129.00,DS-2CD2T47G2H-LISU/SL 4mm IP Bullet 8MP CV AS SS WL 60m 4mm,CC406-28TAS,Surveillance,5508.00,3765.00,DS-2CD2T87G2H-LISU/SL 4mm IP Bullet 8MP CV HL 60m 4mm,CC406-28,Surveillance,5616.00,3844.00,DS-2CD2T87G2H-LI 4mm IP Bullet 4MP AS IR 40m 2.8mm,CC406-29,Surveillance,2908.00,2006.00,DS-2CD2046G2H-I (2.8mm)(C)(O-S IP Bullet 4MP AS 40m 4mm,CC406-30,Surveillance,2852.00,1948.00,DS-2CD2046G2H-I(4mm)(O-STD) IP Bullet 4MP Poly CV 40m 2.8mm,CC406-31,Surveillance,4198.00,2896.00,New DS-2XC6047G0-LS(2.8mm)(O-STD)( IP Bullet 4MP AS IR 50m MVF 2.8-12mm,CC406-32,Surveillance,6027.00,4125.00,New DS-2CD2646G2HT-IZS2U/SL(2.8-12 IP Bullet 4MP AS SS IR60m 4mm,CC406-33TAS,Surveillance,3762.00,2599.00,New DS-2CD2T46G2H-ISU/SL(4mm)(eF)9 IP Bullet 8MP AS IR40m 2.8mm,CC406-35,Surveillance,4091.00,2804.00,DS-2CD2086G2H-I 2.8mm IP Bullet 8MP AS IR40m 4mm,CC406-36,Surveillance,4091.00,2804.00,DS-2CD2086G2H-I 4mm IP Bullet 8MP AS IR60m 2.8-12mm,CC406-37,Surveillance,6940.00,4788.00,New DS-2CD2686G2HT-IZS IP Bullet 4MP AS SS IR 60m 2.8mm,CC406-39TAS,Surveillance,3786.00,2645.00,New DS-2CD2T46G2H-IS2U/SL(2.8mm)(e IP Bullet 4MP CV HL40m 2.8mm,CC406-43,Surveillance,3765.00,2498.00,New DS-2CD2047G3-LI2UY(2.8mm)(O-ST IP Bullet 4MP CV HL60m 4mm,CC406-44,Surveillance,4620.00,3089.00,New DS-2CD2T47G3-LIY(4mm)(O-STD) IP Dome 2MP EIP1.0 HL MVF,CC401-5,Surveillance,3916.00,2699.00,DS-2CD2721G0-LIZSU(2.8-12mm)So IP Dome 4MP EIP1.0 HL MVF,CC401-6,Surveillance,3947.00,2723.00,DS-2CD2741G0-LIZSU(2.8-12mm)So IP Dome 4MP AS Audio IR10m 2.8mm,CC407-5,Surveillance,3504.00,2394.00,DS-2CD2546G2-IS IP Dome 4MP AS IR 30m 2.8mm,CC408-26,Surveillance,3169.00,2171.00,DS-2CD2146G2H-ISU(2.8mm)(O-STD IP Dome 4MP AS 30m 4mm,CC408-27,Surveillance,3140.00,2152.00,DS-2CD2146G2H-ISU(4mm)(O-STD) IP Dome 4MP CV WL40m 2.8-12mm,CC408-28,Surveillance,5977.92,3899.00,DS-2CD2747G2T-LZS(2.8-12mm)(C) IP Dome 8MP AS Audio IR30m 2.8mm,CC408-30,Surveillance,4195.00,2877.00,New DS-2CD2186G2H-ISU (2.8mm)(eF)( IP Dome 8MP AS IR40m PTRZ 2.8-12mm,CC408-31,Surveillance,7629.00,5229.00,New DS-2CD2786G2H-IPTRZS(2.8-12mm) IP Dome 4MP AS IR40m PTRZ 2.8-12mm,CC408-32,Surveillance,5969.00,4091.00,New DS-2CD2746G2H-IPTRZS(2.8-12mm) IP Dome 4MP CV HL 30m 2.8mm,CC408-35,Surveillance,4154.00,2759.00,New DS-2CD2147G3-LIS2UY(2.8mm)(O-S IP Thermal Bullet 640x512 15mm,CC352,Surveillance,98610.00,67375.00,DS-2TD2167-15/PY IP Thermal Bullet 640x512 25mm,CC353,Surveillance,98610.00,67375.00,DS-2TD2167-25/PY IP Thermal DL Bullet 384x288 25mm,CC354,Surveillance,67580.00,46174.00,DS-2TD2637-25/QY IP Thermal DL Bullet 384x288 15mm,CC354-1,Surveillance,62030.00,42510.00,HM-TD2638-15/G0/T1Y IP Thermal DL Bullet 384x288 25mm,CC354-2,Surveillance,73024.00,50386.00,HM-TD2638-25/G0/T1Y IP Thermal DL Bullet 384x288 35mm,CC354-3,Surveillance,76779.00,52618.00,HM-TD2638-35/G0/T1Y IP Thermal Bullet 640x512 75mm,CC356,Surveillance,140157.00,95762.00,DS-2TD2367-75/PY IP Thermal PT 256x192 10mm,CC357,Surveillance,31313.00,21394.00,DS-2TD4228-10/S2 IP Thermal PT 256x192 7mm,CC357-1,Surveillance,30001.40,20498.06,DS-2TD4228-7/S2 IP Thermal PT 384x288 25mm,CC358-1,Surveillance,109091.00,74536.00,DS-2TD4137-25/WY IP Thermal PT 384x288 25mm,CC358-2,Surveillance,83995.00,57956.00,DS-2TD4238-25/S2`;

// Heuristic: The Category "Surveillance" is consistent. 
// Structure of chunks between "Surveillance" blocks: 
// [Retail], [Cost], [Description] [Name], [Code]
// Note: Code is immediately before Surveillance. 
// Cost is immediately after previous Surveillance's Retail.
// So: `..., Surveillance, [Retail], [Cost], [Desc+Name], [Code], Surveillance, ...`

// Step 1: Split by ',Surveillance,'
const parts = rawData.split(',Surveillance,');
// First part is "Header... Item1 info [Retail] [Cost]" ? No.
// rawData starts with Header.
// First match of ",Surveillance," is in item 1.
// Part 0: `name,code,category,retail_price,cost_price,description HIK HD-TVI 4Ch Hi-Res DVR 4 Cam Base Kit,SP150-5`
// Part 1: `3422.00,2395.00, HIK HD-TVI 8Ch Hi-Res DVR 8 Cam Base Kit,SP151-5`
// ... and so on.

// We need to parse Part 0 to get Header + Item 1 Start.
// Header ends at 'description'. Then a space? or just text.
// "description HIK..." -> "description" is the header. "HIK..." is Item 1 Name.

const rows = [];

// Handle Part 0
let part0 = parts[0];
const headerEndIndex = part0.indexOf('description') + 11;
let item1Part = part0.substring(headerEndIndex).trim(); // "HIK HD-TVI ... ,SP150-5"
// item1Part should split into Name, Code.
// Last comma separates Code.
let lastComma = item1Part.lastIndexOf(',');
let name1 = item1Part.substring(0, lastComma);
let code1 = item1Part.substring(lastComma + 1);
// Note: Category 'Surveillance' was consumed by split.
// We need to fetch Retail and Cost from the START of Part 1.

for (let i = 1; i < parts.length; i++) {
    // Current part starts with: Retail, Cost, [Desc + Name], Code
    // UNLESS it's the last part.
    // Last part: `83995.00,57956.00,DS-2TD4238-25/S2` -> This ends with Description/Name? No, prompt had "description" last.
    // Let's re-read the Raw Data end: `...,DS-2TD4238-25/S2`
    // Wait, the prompt asked for: Name, Code, Cat, Retail, Cost, Desc.
    // The user string ends with `DS-2TD4238-25/S2`.
    // It seems "Cost" `57956.00` is followed by `DS-2TD...`.
    // Where is the separator? `,`
    // So `57956.00` is cost. `DS-2TD...` is Description.
    // And that is the end.

    let currentPart = parts[i];
    // Format: `Retail, Cost, [Rest]`
    // Split by comma.
    let tokens = currentPart.split(',');
    // tokens[0] = Retail
    // tokens[1] = Cost
    // Rest is merged.

    let retail = tokens[0];
    let cost = tokens[1];
    let descAndNameAndCode = tokens.slice(2).join(',');

    // Previous item needs Retail and Cost and Description pushed.
    // Wait, currentPart belongs to PREVIOUS item's Price/Cost/Desc?
    // Sequence in string: Name, Code, Cat, Retail, Cost, Desc
    // Split key: Cat (Surveillance).
    // Part X ending: Code. (From previous iteration logic)
    // Part X+1 starting: Retail, Cost, Desc...
    // Ah, Part 0 ended with Code (SP150-5).
    // Part 1 starts with Retail (3422.00), Cost (2395.00), Desc+Name+Code...

    // So item N is composed of:
    // Name, Code (from end of Part N-1)
    // Category (Implied)
    // Retail, Cost (from start of Part N)
    // Description (from start of Part N, mixed with Name of N+1)

    // We need to finalize Item N using Part N data.
    // Then prepare proper 'Name, Code' for Item N+1 from the rest of Part N.

    // Let's refine parsing of `descAndNameAndCode`.
    // It contains: `[Description N] [Name N+1], [Code N+1]`
    // The `Code N+1` is at the end.
    let lastCommaIndex = descAndNameAndCode.lastIndexOf(',');
    if (i === parts.length - 1) {
        // Last part.
        // It ends with Description of the last item. There is no N+1.
        // `83995.00,57956.00,DS-2TD4238-25/S2`
        // descAndNameAndCode is `DS-2TD4238-25/S2`
        // So Item N (last item) is done.
        let desc = descAndNameAndCode;
        rows.push([prevName, prevCode, 'Surveillance', retail, cost, desc].join(','));
        continue;
    }

    let codeNext = descAndNameAndCode.substring(lastCommaIndex + 1);
    let descAndName = descAndNameAndCode.substring(0, lastCommaIndex); // `[Description N] [Name N+1]`

    // Heuristic splitting of Description and Name.
    // Common patterns for Name start: "HIK", "HD-TVI", "IP", "NEW", "On Request", "DS-"(?), "iDS-", "HM-"
    // Wait, "DS-" is usually the Description (Model) in this data?
    // Let's look at the first split manually.
    // Part 1: `3422.00,2395.00, HIK HD-TVI 8Ch...`
    // ` , HIK ...` -> Comma then space?
    // If there is a leading comma in `descAndNameAndCode`?
    // tokens.slice(2) removed the `Retail, Cost` part.
    // `3422.00,2395.00, HIK...` -> tokens[2] is ` HIK...` (starts with space).
    // So Description N is empty?

    // Check Part 2: `...1107.00,DS-2CE...`
    // tokens[2] is `DS-2CE...`.
    // This `DS-2CE...` contains `(O-S HD-TVI Bullet...`
    // We saw earlier: `DS-2CE12DF3T-PIRXOS(2.8mm)(O-S` is likely Description.
    // `HD-TVI Bullet...` is Name.
    // There is a space between them? `(O-S HD-TVI`. Yes.

    // Strategy: Find the LAST regex match of a "Product Start" pattern?
    // Or Find the separation between Model-like string and Descriptive Name?
    // Model strings: `DS-`, `SP`, `CC`, `iDS-`, `HM-`.
    // Names: `HIK`, `HD-TVI`, `IP`, `Analogue`, `NVR`.

    // Clean heuristic:
    // If it starts with ` HIK` or ` HD-TVI` -> Description is empty. Name is the rest.
    // If it starts with `DS-` or `New DS-` or `On Request DS-`... 
    // Wait usually `New` is part of Name? 
    // `New DS-2CD... IP Bullet...` -> `New DS-...` is Model? `IP Bullet` is Name?
    // This is getting messy.

    // Alternative: The prompt asked for `name`. In the previous manual inspection:
    // `HIK HD-TVI...` was name. `SP...` was code.
    // `DS-2CE...` was Description? 
    // Actually, `name` column 1. `code` column 2.
    // Item 1: Name=`HIK HD-TVI...`, Code=`SP150-5`.
    // Item 4: Name=`HD-TVI Bullet...`, Code=`CC376-8`. Description=`DS-2CE...`?
    // Item 5: Name=`HD-TVI Bullet...` (inferred).

    // Let's look at Part 4 (`1107.00,DS-2CE12DF3T-PIRXOS(2.8mm)(O-S HD-TVI Bullet 2MP HL Audio 2.8mm`).
    // Retail=1625, Cost=1107.
    // Desc/Name blob: `DS-2CE12DF3T-PIRXOS(2.8mm)(O-S HD-TVI Bullet 2MP HL Audio 2.8mm`
    // Next Code: `CC376-13`.
    // Previous Name: `HD-TVI Bullet 2MP CV PIR 2.8mm`.
    // Previous Code: `CC376-8`.

    // If I put `DS-2CE...` in Description of Prev Item, and `HD-TVI...` in Name of Next Item.
    // Separation is space? `(O-S ` -> `HD-TVI`.
    // Regex for Name Start: `(HIK|HD-TVI|IP Bullet|IP Dome|NVR|Analogue|DeepInMind|HikCentral)`.

    let splitRegex = /(?=\s(HIK|HD-TVI|IP|NVR|Analogue|DeepInMind|HikCentral|New|On Request|EOL))/;
    // Note: `New` and `On Request` seem to prepend the Name or Model?
    // `New DS-2CE...` -> If `New` is here, is it Description or Name?
    // User row 22: `NEW DS-2CE16K0T...`
    // User row 50: `New DS-2CD...`
    // Often "New" indicates a new product listing.
    // If the format is strictly `Name, Code...`
    // "New DS-..." might be the Name?
    // Let's trust the "Name" column to capture the main text.

    let splitParts = descAndName.split(splitRegex);
    // splitRegex with capture group includes the capture.
    // We want the last major block that looks like a Name.

    // Let's stick to a simpler parsing logic based on the manual inspection.
    // The "Name" usually contains "DVR", "Bullet", "Dome", "NVR", "Server".
    // The "Description" usually contains "DS-" or is empty.

    // Better yet: Just dump it, imperfect is better than nothing.
    // I'll try to split on " HD-TVI", " IP ", " NVR".

    // Let's iterate backwards from the end of string to find the break?
    // No.

    // Let's try to assume Description is `DS-...` or empty.
    // And Name is `...`.
    // If `tokens` has more than 1 element (comma definition inside Desc+Name?)
    // No, `descAndNameAndCode` was logic.

    // Let's use a very dumb separator: The user strings generally have `DS-...` as description.
    // And `HD-TVI...` as Name.
    // I will look for the pattern `[Space] [NameKeywords]`

    let nameKeywords = ["HD-TVI", "IP ", "NVR", "Analogue", "HikCentral"];
    let splitIndex = -1;

    // Find first occurrence of keywords? No, Name is the Second part.
    // Description (First part) -> Name (Second part).
    // `DS-2CE... (O-S` [Break] `HD-TVI...`

    for (let kw of nameKeywords) {
        let idx = descAndName.indexOf(kw);
        if (idx > 0) { // If found and not at very start (which would mean empty desc)
            // If found, check if it looks like a separator.
            // We want the *last* valid name start? No, there is only one transition.
            // But `HD-TVI` might appear in Description? Unlikely.
            // Let's pick the first match.
            if (splitIndex === -1 || idx < splitIndex) {
                splitIndex = idx;
            }
        }
    }

    let desc = "";
    let nameNext = "";

    if (splitIndex > -1) {
        desc = descAndName.substring(0, splitIndex).trim();
        nameNext = descAndName.substring(splitIndex).trim();
    } else {
        // Fallback: If no keyword found, assumes empty description if starts with typical Name casing?
        // Or assumes everything is Name if Code was found? 
        // If Description is empty, text is just Name.
        // ` , HIK ...` -> `desc=""`, `name="HIK..."`
        if (descAndName.trim().startsWith("HIK") || descAndName.trim().startsWith("New") || descAndName.trim().startsWith("On Request") || descAndName.trim().startsWith("EOL")) {
            desc = "";
            nameNext = descAndName.trim();
        } else {
            // Maybe everything is description? Unlikely.
            // Assume split failed. Put all in Name? Or Desc?
            // Defaults to Name.
            nameNext = descAndName.trim();
        }
    }

    // Push Item N
    rows.push([prevName, prevCode, 'Surveillance', retail, cost, desc].join(','));

    // Set up for Item N+1
    prevName = nameNext;
    prevCode = codeNext;
}

// Initial setup from Part 0
var prevName = name1;
var prevCode = code1;

// Write output
const header = 'name,code,category,retail_price,cost_price,description';
const csvContent = header + '\\n' + rows.join('\\n');
fs.writeFileSync('products_import.csv', csvContent);
console.log('CSV Created with ' + rows.length + ' rows.');
