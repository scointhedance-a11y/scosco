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
    ] },
  { id: "p7-05", title: "お知らせ", type: "Notice",
    passage:
`NOTICE TO TENANTS
Greenfield Tower Management

Beginning Monday, March 3, the main entrance on Pine Street will be closed for approximately two weeks while the lobby floor is replaced. During this time, please use the side entrance on Harbor Avenue. The security desk will be temporarily relocated next to the Harbor Avenue entrance, and all visitors must sign in there.

Deliveries will continue to be accepted at the loading dock behind the building. Tenants expecting large deliveries should inform the management office at least 24 hours in advance so that the freight elevator can be reserved.

We apologize for any inconvenience. Questions may be directed to the management office at extension 400.`,
    questions: [
      { id: "p7-05-1", q: "Why will the main entrance be closed?",
        choices: ["Flooring work will be done.", "The security desk is being upgraded.", "A new elevator is being installed.", "The street is being repaved."], a: 0,
        exp: "the lobby floor is replaced = flooring work の言い換え。" },
      { id: "p7-05-2", q: "What are visitors required to do during the closure?",
        choices: ["Sign in near the Harbor Avenue entrance", "Use the loading dock", "Call extension 400", "Show a tenant ID card"], a: 0,
        exp: "警備デスクが Harbor Avenue 側に移り、visitors must sign in there。" },
      { id: "p7-05-3", q: "What should tenants do before receiving a large delivery?",
        choices: ["Notify the management office in advance", "Move their vehicles", "Pay an additional fee", "Use the main entrance"], a: 0,
        exp: "inform the management office at least 24 hours in advance の言い換え。" }
    ] },
  { id: "p7-06", title: "商品レビュー", type: "Online review",
    passage:
`Rating: 4 out of 5 stars
Reviewed by Paulo Mendes, June 8

I recently bought the Vexa X2 portable speaker for a weekend camping trip, and it exceeded my expectations. The sound quality is impressive for such a small device, and the battery lasted the full two days on a single charge. It also survived a sudden rainstorm without any problems, which I was glad about, since the manufacturer describes it only as "water-resistant."

My one complaint is the companion app. Connecting the speaker to my phone took several attempts, and the app's instructions were difficult to follow. Once it was connected, though, everything worked smoothly. I would still recommend the X2, especially for people who spend a lot of time outdoors.`,
    questions: [
      { id: "p7-06-1", q: "Why did Mr. Mendes purchase the speaker?",
        choices: ["To use it on a camping trip", "To replace a broken speaker", "To give it as a gift", "To review it for a magazine"], a: 0,
        exp: "for a weekend camping trip。" },
      { id: "p7-06-2", q: "What is suggested about the speaker?",
        choices: ["It kept working after getting wet.", "It is the manufacturer's newest model.", "Its battery needed to be recharged daily.", "It is larger than similar products."], a: 0,
        exp: "survived a sudden rainstorm without any problems から推測できる。電池は2日もった。" },
      { id: "p7-06-3", q: "What problem did Mr. Mendes have?",
        choices: ["He had trouble connecting the speaker to his phone.", "The sound quality was poor.", "The speaker arrived late.", "The app was not free."], a: 0,
        exp: "Connecting the speaker to my phone took several attempts。" }
    ] },
  { id: "p7-07", title: "案内とEメール（ダブルパッセージ）", type: "Invitation + E-mail",
    passage:
`[Document 1: Invitation]
Northbridge Business Association
Annual Networking Luncheon
Thursday, November 13, 12:00 - 2:00 P.M.
Riverside Hotel, Crystal Ballroom

Keynote speaker: Dr. Hannah Cho, author of Small Firms, Big Markets
Tickets: $45 for members, $60 for non-members
Register by November 5 at www.northbridgeba.org. Registrations received after this date will be charged an additional $10 per ticket.

[Document 2: E-mail]
To: events@northbridgeba.org
From: Victor Elling <velling@ellingdesign.com>
Date: November 7
Subject: Luncheon registration

Hello,

I would like to register two people from my company for the luncheon on November 13: myself and my colleague, Ana Ruiz. We joined the association last month, so I assume we qualify for the member price. Ms. Ruiz is a vegetarian, so please let me know whether a meat-free meal can be arranged.

I am especially looking forward to Dr. Cho's talk, as I have read her book.

Best regards,
Victor Elling`,
    questions: [
      { id: "p7-07-1", q: "What is indicated about the luncheon?",
        choices: ["It will feature a talk by an author.", "It is held every month.", "It is open only to members.", "It will take place in the evening."], a: 0,
        exp: "基調講演者は本の著者 (author of Small Firms, Big Markets)。非会員料金があるので (C) は誤り。" },
      { id: "p7-07-2", q: "How much will Mr. Elling most likely pay for each ticket?",
        choices: ["$45", "$55", "$60", "$70"], a: 1,
        exp: "2つの文書の照合問題。会員料金 $45 だが、申込日 (11月7日) が締切 (11月5日) より後なので $10 加算され $55。" },
      { id: "p7-07-3", q: "What does Mr. Elling ask about?",
        choices: ["A special meal option", "Parking at the hotel", "A membership discount", "The length of the talk"], a: 0,
        exp: "a meat-free meal can be arranged かどうかを問い合わせている。" }
    ] },
  { id: "p7-08", title: "プレスリリース（文挿入問題つき）", type: "Press release",
    passage:
`FOR IMMEDIATE RELEASE
Tavora Foods Opens Research Kitchen in Lisbon

LISBON, May 20 - Tavora Foods, a leading producer of frozen meals, today opened a new research kitchen at its Lisbon headquarters. - [1] -. The facility will allow the company's team of twelve chefs and food scientists to develop and test new recipes more quickly.

"In the past, we relied on outside test kitchens, which often meant waiting weeks for results," said Ines Duarte, Tavora's head of product development. - [2] -. "Now we can move from an idea to a finished product in half the time."

The company plans to introduce at least ten new products next year, with a focus on low-sodium and plant-based meals. - [3] -. Tavora's products are currently sold in more than 4,000 supermarkets across Europe. - [4] -.`,
    questions: [
      { id: "p7-08-1", q: "What is the purpose of the press release?",
        choices: ["To announce the opening of a facility", "To introduce a new head chef", "To report annual sales figures", "To advertise a cooking class"], a: 0,
        exp: "研究用キッチンの開設を発表するプレスリリース。" },
      { id: "p7-08-2", q: "According to Ms. Duarte, what was a drawback of the previous arrangement?",
        choices: ["It caused long delays.", "It was too expensive.", "It required extra staff.", "It produced inaccurate results."], a: 0,
        exp: "waiting weeks for results = long delays の言い換え。" },
      { id: "p7-08-3", q: "In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? \"These reflect growing consumer demand for healthier options.\"",
        choices: ["[1]", "[2]", "[3]", "[4]"], a: 2, fixed: true,
        exp: "These は直前の low-sodium and plant-based meals（減塩・植物性の食事）を指し、healthier options と内容が合う。" }
    ] },
  { id: "p7-09", title: "オンラインチャット", type: "Online chat discussion",
    passage:
`Kevin Park [2:05 P.M.]
Has anyone booked a venue for the sales training on the 24th?

Maria Lopez [2:07 P.M.]
I called the Fairmont Conference Center yesterday. Their large room is already reserved that day.

Kevin Park [2:08 P.M.]
That's a shame. We'll have about 60 attendees.

Dev Shah [2:10 P.M.]
What about using our own building? The cafeteria holds 80 people if we move some tables.

Maria Lopez [2:11 P.M.]
That could work. We'd need a projector and microphones, though.

Dev Shah [2:12 P.M.]
I'll take care of that. Our IT department has both.

Kevin Park [2:14 P.M.]
Perfect. Maria, can you let the cafeteria staff know we'll need the space from 9 to 4?

Maria Lopez [2:15 P.M.]
Will do.`,
    questions: [
      { id: "p7-09-1", q: "What are the writers mainly discussing?",
        choices: ["Where to hold a training session", "How to reduce event costs", "When to hire new salespeople", "What to serve at lunch"], a: 0,
        exp: "研修の会場をどこにするかの相談。" },
      { id: "p7-09-2", q: "At 2:08 P.M., what does Mr. Park mean when he writes, \"That's a shame\"?",
        choices: ["He is disappointed that a room is unavailable.", "He thinks the training is too long.", "He regrets booking the wrong venue.", "He is unhappy with the number of attendees."], a: 0,
        exp: "意図問題。希望の会場が埋まっていたことへの落胆。" },
      { id: "p7-09-3", q: "What will Mr. Shah most likely do?",
        choices: ["Arrange for some equipment", "Contact the Fairmont Conference Center", "Move tables in the cafeteria", "Lead the sales training"], a: 0,
        exp: "プロジェクターとマイクについて I'll take care of that と引き受けている。" }
    ] }
];
