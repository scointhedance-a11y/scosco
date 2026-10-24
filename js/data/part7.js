// Part 7（読解）: 本番は1問あたり約1分。語数から読む速度(WPM)も計測する
window.TOEIC_DATA = window.TOEIC_DATA || {};
window.TOEIC_DATA.part7 = [
  { id: "p7-01", title: "Eメール", type: "E-mail",
    passage:
`To: All Staff
From: Margaret Lin, Facilities Manager
Subject: Parking lot resurfacing
Date: September 12

Dear colleagues,

The east parking lot will be resurfaced from Monday, September 22, through Friday, September 26. During this period, the lot will be completely closed. Employees who normally park there may use the west lot, which has been expanded by 40 spaces. Please note that the west lot fills up quickly, so we recommend arriving before 8:30 A.M.

Alternatively, the company will provide a free shuttle from the Riverside train station every fifteen minutes between 7:00 and 10:00 A.M. Staff who choose to take public transportation that week may also submit their train receipts to the accounting department for full reimbursement.

Thank you for your patience.

Margaret Lin`,
    questions: [
      { id: "p7-01-1", q: "What is the purpose of the e-mail?",
        choices: ["To announce a temporary closure", "To introduce a new manager", "To request feedback on a shuttle service", "To explain a change in office hours"], a: 0,
        exp: "東側駐車場が工事で一時閉鎖されることを知らせるメール。" },
      { id: "p7-01-2", q: "What is suggested about the west parking lot?",
        choices: ["It will be closed on September 26.", "It has recently been made larger.", "It is reserved for visitors.", "It is located near the train station."], a: 1,
        exp: "has been expanded by 40 spaces の言い換え。" },
      { id: "p7-01-3", q: "What can employees do to receive reimbursement?",
        choices: ["Arrive before 8:30 A.M.", "Register for the shuttle", "Submit their train receipts", "Contact Ms. Lin directly"], a: 2,
        exp: "submit their train receipts to the accounting department for full reimbursement。" }
    ] },
  { id: "p7-02", title: "求人広告", type: "Advertisement",
    passage:
`Harbor View Hotel — Now Hiring: Guest Relations Coordinator

Harbor View Hotel, a 220-room waterfront property, is seeking an energetic Guest Relations Coordinator to join our front office team. The successful candidate will respond to guest inquiries, coordinate special requests, and work closely with our concierge and housekeeping departments to ensure a seamless stay.

Requirements:
- At least two years of experience in hospitality or customer service
- Fluency in English; proficiency in a second language is preferred but not required
- Availability to work weekends and holidays

We offer competitive pay, meal benefits, and discounted stays at our partner hotels worldwide. To apply, send a cover letter and résumé to careers@harborviewhotel.com by October 15. Shortlisted candidates will be invited for an interview during the last week of October.`,
    questions: [
      { id: "p7-02-1", q: "What is NOT listed as a responsibility of the position?",
        choices: ["Answering guest questions", "Handling special requests", "Training housekeeping staff", "Working with the concierge"], a: 2,
        exp: "NOT問題。housekeeping とは「協力する」だけで、「研修する」とは書かれていない。" },
      { id: "p7-02-2", q: "What is indicated about knowledge of a second language?",
        choices: ["It is mandatory.", "It is desirable but optional.", "It will be tested at the interview.", "It is required for weekend shifts."], a: 1,
        exp: "preferred but not required = desirable but optional。" },
      { id: "p7-02-3", q: "According to the advertisement, when will interviews take place?",
        choices: ["Before October 15", "In mid-October", "In late October", "In early November"], a: 2,
        exp: "during the last week of October = in late October。" }
    ] },
  { id: "p7-03", title: "テキストメッセージ", type: "Text-message chain",
    passage:
`Ryan Cole [10:12 A.M.]
Hi Aiko, are you still at the printer's? The client just called and wants to change the date on the event flyer.

Aiko Mori [10:14 A.M.]
I'm here now. They haven't started printing yet. What's the new date?

Ryan Cole [10:15 A.M.]
May 18 instead of May 11. Everything else stays the same.

Aiko Mori [10:16 A.M.]
That shouldn't be a problem. I'll ask them to update the file. Will the client need the flyers sooner, then?

Ryan Cole [10:18 A.M.]
Not at all. If anything, we have an extra week now.

Aiko Mori [10:19 A.M.]
Great. I'll confirm the change and head back to the office.`,
    questions: [
      { id: "p7-03-1", q: "Why did Mr. Cole contact Ms. Mori?",
        choices: ["To ask her to pick up flyers", "To report a change requested by a client", "To cancel a printing order", "To schedule a meeting with a client"], a: 1,
        exp: "顧客から日付変更の依頼があったことを伝えている。" },
      { id: "p7-03-2", q: "At 10:18 A.M., what does Mr. Cole most likely mean when he writes, \"Not at all\"?",
        choices: ["The client does not want the flyers.", "The flyers are not needed earlier than planned.", "He does not agree with Ms. Mori.", "The printer has not received the file."], a: 1,
        exp: "意図問題。「もっと早く必要になるか？」への否定。むしろ1週間余裕ができたと続けている。" },
      { id: "p7-03-3", q: "What will Ms. Mori most likely do next?",
        choices: ["Call the client", "Visit another printer", "Confirm a change with the printer", "Design a new flyer"], a: 2,
        exp: "I'll confirm the change and head back to the office。" }
    ] },
  { id: "p7-04", title: "記事（文挿入問題つき）", type: "Article",
    passage:
`LOCAL BAKERY EXPANDS TO THREE NEW LOCATIONS

WESTFIELD (April 3) — Morning Crust Bakery, which opened its first shop on Elm Street eight years ago, announced yesterday that it will open three additional branches by the end of the year. — [1] —.

Owner Sofia Bianchi said the expansion was made possible by a partnership with Valley Grain Cooperative, a group of regional farmers who will supply the bakery with organic flour. — [2] —. "Customers kept asking us to open closer to where they live and work," Ms. Bianchi explained.

The first of the new shops is scheduled to open in June near Westfield Central Station. — [3] —. The other two, in the suburbs of Oakdale and Pine Hill, will open in the autumn. The company also plans to hire about 45 new employees, many of whom will receive training at the original Elm Street location. — [4] —.`,
    questions: [
      { id: "p7-04-1", q: "What is the article mainly about?",
        choices: ["A new type of flour", "The growth of a local business", "A farmers' market", "A change in ownership"], a: 1,
        exp: "地元のパン屋が3店舗を新規出店するという記事。" },
      { id: "p7-04-2", q: "What is mentioned about Valley Grain Cooperative?",
        choices: ["It is located near the train station.", "It will supply an ingredient.", "It was founded eight years ago.", "It will train new employees."], a: 1,
        exp: "organic flour を供給する = supply an ingredient。" },
      { id: "p7-04-3", q: "In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? \"This location is expected to attract many commuters.\"",
        choices: ["[1]", "[2]", "[3]", "[4]"], a: 2, fixed: true,
        exp: "This location は直前の「駅の近く (near Westfield Central Station)」を指す。通勤客 (commuters) とも整合する。" }
    ] }
];
