# 🔄 LifeLink: Simple App Cycles Guide

> **What is this file?**  
> A simple, short, text-based explanation of the **5 main cycles** of the app.  
> Read each cycle with your friend. For each cycle, you will see:
> 1. **How it works right now** (Step-by-step)
> 2. **Who is involved**
> 3. **What is slow or complicated**
> 4. **How you can edit it or create a new cycle**

---

## 🔁 Cycle 1: The Emergency Blood Request Cycle (Main Flow)

This is the central cycle of the entire app: from someone needing blood to blood being received.

### Current Step-by-Step Flow:
```
[Patient] ➡️ creates blood request (picks blood group, units, hospital)
    ⬇️
[Hospital] ➡️ reviews request & approves it (Status: VERIFIED)
    ⬇️
[Blood Bank] ➡️ checks their storage inventory
    ├── Path A (Stock Available): Blood Bank takes units from stock (DIRECT)
    └── Path B (Stock Low): Blood Bank broadcasts alert to public donors (COMMUNITY)
         ⬇️
    [Donor] ➡️ sees alert, clicks "I will donate", goes to blood bank
         ⬇️
    [Blood Bank] ➡️ collects blood from donor in person (Status: READY FOR DISPATCH)
    ⬇️
[Blood Bank] ➡️ packages and sends blood to hospital (Status: DISPATCHED)
    ⬇️
[Hospital] ➡️ receives blood and clicks "Confirm Received" (Status: BLOOD RECEIVED - Complete!)
```

### Who is involved:
* **Patient** $\rightarrow$ **Hospital** $\rightarrow$ **Blood Bank** $\rightarrow$ **Volunteer Donor** (if low stock)

### Current Friction (Why it's complicated):
* **Too many handoffs:** 4 different people must take manual action before a patient gets blood.
* If the hospital doctor is busy and doesn't click "Verify", the request never reaches the blood bank.

### ✏️ How You Can Edit / Create a New Cycle:
* **Option A (Uber for Blood Model):**  
  Patient posts request $\rightarrow$ App immediately pings the 10 closest compatible donors via WhatsApp/Push Notification $\rightarrow$ Donor goes directly to patient's hospital. *(Removes Blood Bank & Hospital review steps).*
* **Option B (Direct Blood Bank Order):**  
  Patient searches nearby blood banks $\rightarrow$ sees live stock $\rightarrow$ reserves units directly without waiting for hospital approval.

---

## 🔁 Cycle 2: The Hospital ↔ Blood Bank Partnership Cycle

Before any hospital can verify a patient request, it must be linked with a blood bank.

### Current Step-by-Step Flow:
```
[Hospital] ➡️ searches approved blood banks in the system
    ⬇️
[Hospital] ➡️ sends a link request to ONE blood bank (Status: PENDING)
    ⬇️
[Blood Bank] ➡️ reviews hospital request and clicks "Approve" (Status: APPROVED)
    ⬇️
[Result] ➡️ Hospital and Blood Bank are now locked 1-to-1.
            All future requests from this hospital go ONLY to this blood bank.
```

### Who is involved:
* **Hospital Admin** $\rightarrow$ **Blood Bank Admin**

### Current Friction (Why it's complicated):
* **Hard lock:** A hospital can only link to **one** blood bank at a time.
* If that blood bank runs out of blood, the hospital cannot order from another blood bank unless they unlink first!
* Unlinking is blocked if any requests are still being processed.

### ✏️ How You Can Edit / Create a New Cycle:
* **Option A (Remove entirely):**  
  Delete hospital-to-bank linking completely. Any hospital can request blood from ANY blood bank that has units in stock.
* **Option B (Marketplace Pool):**  
  Hospital sends request to a regional pool $\rightarrow$ whichever blood bank has stock accepts it.

---

## 🔁 Cycle 3: The Donor Volunteer & Eligibility Cycle

How a normal user becomes a donor and donates blood.

### Current Step-by-Step Flow:
```
[User] ➡️ flips "Donor Mode" switch to ON in profile
    ⬇️
[App] ➡️ checks rules:
    ├── Is donor's blood compatible with patient? (e.g. O- can give to anyone)
    └── Has donor waited 90 days since last donation? (Cooldown check)
    ⬇️
[Donor] ➡️ views "Published Requests" feed and clicks "Respond"
    ⬇️
[App] ➡️ sends donor the address and contact number of the Blood Bank
    ⬇️
[Donor] ➡️ physically travels to the blood bank to donate
    ⬇️
[Blood Bank] ➡️ staff clicks "Verify Blood Collected" in the system
    ⬇️
[App] ➡️ resets donor's cooldown timer (last donation date = today).
            Donor cannot donate again for 90 days.
```

### Who is involved:
* **Citizen Donor** $\rightarrow$ **Blood Bank Staff**

### Current Friction (Why it's complicated):
* Requires blood bank staff to manually search the donor's ID on a computer to confirm they showed up.
* Donors don't get live directions or instant reminders.

### ✏️ How You Can Edit / Create a New Cycle:
* **Option A (QR Code / OTP Check-in):**  
  Donor gets a simple 4-digit OTP or QR code on their phone $\rightarrow$ scanned at desk to automatically verify.
* **Option B (Self-confirmation with Hospital Slip):**  
  Donor uploads a photo of the donation receipt/certificate to verify.

---

## 🔁 Cycle 4: The NGO Blood Donation Camp Cycle

How NGO organizations host community blood donation drives.

### Current Step-by-Step Flow:
```
[NGO] ➡️ fills out form: Camp Title, Venue, Date & Time, Map Pin, Contact Phone
    ⬇️
[App] ➡️ publishes camp to the public "Upcoming Camps" list (Status: ACTIVE)
    ⬇️
[Citizen] ➡️ browses upcoming camps on map/list and clicks "Register to Attend"
    ⬇️
[Drive Day] ➡️ NGO holds the blood camp event
    ⬇️
[NGO] ➡️ clicks "End Camp" in dashboard (Status: COMPLETED)
```

### Who is involved:
* **NGO** $\rightarrow$ **Citizens**

### Current Friction (Why it's complicated):
* It's mostly an informational bulletin board. Blood collected at the camp does not automatically update blood bank inventory numbers.

### ✏️ How You Can Edit / Create a New Cycle:
* **Option A (Link Camp to Blood Bank Inventory):**  
  When camp ends, NGO enters total units collected $\rightarrow$ units are automatically credited to the partnering blood bank's live inventory.
* **Option B (Remove NGO Role):**  
  If your app focuses purely on emergency peer-to-peer blood matching, you can remove the entire NGO/Camps cycle to make the app much simpler.

---

## 🔁 Cycle 5: Organization Verification Cycle (Admin KYC)

How new hospitals, blood banks, and NGOs are allowed into the platform.

### Current Step-by-Step Flow:
```
[Institution] ➡️ registers via web form with Govt Reg ID & Address
    ⬇️
[App] ➡️ creates account with status = PENDING (Login is BLOCKED with 403 Forbidden)
    ⬇️
[Admin] ➡️ logs into admin dashboard and opens "Organization Approvals"
    ⬇️
[Admin] ➡️ clicks "Approve" (Status: APPROVED)
    ⬇️
[Institution] ➡️ can now log in and use the platform
```

### Who is involved:
* **Organization** $\rightarrow$ **Platform Admin**

### Current Friction (Why it's complicated):
* During testing and demos, you cannot log into a newly registered hospital or blood bank until an admin approves it first.

### ✏️ How You Can Edit / Create a New Cycle:
* **Option A (Auto-Approve for Demo/MVP):**  
  Set `approval_status = APPROVED` by default on signup so anyone can test immediately.
* **Option B (Email / OTP Verification):**  
  Replace admin review with standard email verification or instant SMS OTP.

---

## 📊 Summary: Current vs. Proposed Simplification

| Current App Cycle | Current Complexity | What You Can Change in New App |
| :--- | :--- | :--- |
| **1. Blood Request** | 4-step handoff (User $\rightarrow$ Hosp $\rightarrow$ Bank $\rightarrow$ Donor $\rightarrow$ Bank $\rightarrow$ Hosp) | **Simplify to 2 steps:** User posts $\rightarrow$ nearby Donors or Blood Banks respond directly. |
| **2. Hospital Link** | 1-to-1 locked partnership | **Remove linking entirely:** Let hospitals request from any blood bank with stock. |
| **3. Donor Volunteer** | Manual desk verification at blood bank | **QR code / OTP scan** on donor's phone. |
| **4. NGO Camps** | Standalone event list | **Cut if not needed**, or auto-add collected units to stock. |
| **5. Admin KYC** | Admin must manually approve every org | **Auto-approve** on signup for faster onboarding. |

---

## 💡 Quick Discussion Questions for You & Your Friend:
1. **Do we want peer-to-peer matching?** *(Patient asks Donors directly, like Tinder/Uber for blood)*
2. **Do we want institutional coordination?** *(Keep Hospitals & Blood Banks in control so fake requests are blocked)*
3. **How many user types do we really need?** *(Can we drop from 6 roles down to 2 or 3: Patient, Donor, Hospital?)*
