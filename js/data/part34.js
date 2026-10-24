// Part 3（会話）/ Part 4（説明文）: 音声合成で読み上げる
// speaker: M=男性, W=女性, N=ナレーター（Part 4 の話者）
window.TOEIC_DATA = window.TOEIC_DATA || {};
window.TOEIC_DATA.part34 = [
  { id: "p3-01", part: 3, title: "オフィス移転の打ち合わせ",
    lines: [
      { s: "W", t: "Hi, Daniel. Have you had a chance to look at the floor plan for the new office?" },
      { s: "M", t: "I have. The open workspace looks great, but I'm worried there aren't enough meeting rooms. We often have three client meetings at the same time." },
      { s: "W", t: "That's a fair point. The architect said we could convert part of the storage area into two small rooms." },
      { s: "M", t: "That would help. Could you ask her how much that would add to the cost? I need to present the budget to the directors on Friday." },
      { s: "W", t: "Sure, I'll call her this afternoon and send you the figures." }
    ],
    questions: [
      { id: "p3-01-1", q: "What is the man concerned about?",
        choices: ["The size of the storage area", "The number of meeting rooms", "The location of the office", "The cost of furniture"], a: 1,
        exp: "男性は I'm worried there aren't enough meeting rooms と懸念を述べている。" },
      { id: "p3-01-2", q: "What does the woman say the architect suggested?",
        choices: ["Expanding the open workspace", "Moving the move-in date", "Converting part of a storage area", "Renting another floor"], a: 2,
        exp: "convert part of the storage area into two small rooms の言い換え。" },
      { id: "p3-01-3", q: "What will the woman most likely do this afternoon?",
        choices: ["Meet with the directors", "Revise a floor plan", "Contact the architect", "Visit the new office"], a: 2,
        exp: "I'll call her this afternoon の her は architect。call → contact の言い換え。" }
    ] },
  { id: "p3-02", part: 3, title: "注文品の配送トラブル",
    lines: [
      { s: "M", t: "Thank you for calling Brightline Office Supply. How can I help you?" },
      { s: "W", t: "Hi, I placed an order for printer cartridges last week, and the confirmation said they'd arrive by Tuesday. It's Thursday, and they still haven't come." },
      { s: "M", t: "I'm sorry about that. Let me check... It looks like the cartridges were out of stock at our main warehouse, so they're being shipped from another location. They should reach you tomorrow morning." },
      { s: "W", t: "Tomorrow's fine, but we have a large print job due today." },
      { s: "M", t: "In that case, our store on Market Street has them in stock. If you pick them up there, we'll refund the original order and give you ten percent off." }
    ],
    questions: [
      { id: "p3-02-1", q: "Why is the woman calling?",
        choices: ["To cancel an order", "To report a late delivery", "To ask about a price", "To change a shipping address"], a: 1,
        exp: "火曜に届くはずが木曜になっても届いていない、という遅延の連絡。" },
      { id: "p3-02-2", q: "What caused the problem?",
        choices: ["An item was unavailable at a warehouse", "A payment was not processed", "The wrong address was entered", "A delivery truck broke down"], a: 0,
        exp: "out of stock at our main warehouse の言い換え。" },
      { id: "p3-02-3", q: "What does the man offer the woman?",
        choices: ["Free express shipping", "A replacement printer", "A discount for picking up items at a store", "A gift card for her next order"], a: 2,
        exp: "店舗で受け取れば返金し、さらに10%引きにすると提案している。" }
    ] },
  { id: "p3-03", part: 3, title: "研修講師の手配",
    lines: [
      { s: "W", t: "Kenji, the leadership workshop is only two weeks away, and the trainer we booked just canceled." },
      { s: "M", t: "Oh no. Didn't Priya from human resources lead a similar session last year? People really liked it." },
      { s: "W", t: "She did, but she's moved to our Toronto branch." },
      { s: "M", t: "She could still do it by video conference. Most of the material is slides and group discussion anyway." },
      { s: "W", t: "Good idea. I'll e-mail her today. Could you check whether the large conference room has the equipment for a video call?" }
    ],
    questions: [
      { id: "p3-03-1", q: "What problem does the woman mention?",
        choices: ["A room is unavailable", "A trainer has canceled", "A workshop is too expensive", "Few employees have registered"], a: 1,
        exp: "the trainer we booked just canceled。" },
      { id: "p3-03-2", q: "Why does the woman say, \"she's moved to our Toronto branch\"?",
        choices: ["To explain why a colleague might not be able to help", "To recommend a new location for the workshop", "To announce a promotion", "To correct a mistake in a schedule"], a: 0,
        exp: "意図問題。Priya に頼めない理由（もう別拠点にいる）として述べている。" },
      { id: "p3-03-3", q: "What does the woman ask the man to do?",
        choices: ["Contact a colleague", "Prepare some slides", "Check some equipment", "Reserve a flight"], a: 2,
        exp: "会議室にビデオ通話の機材があるか確認するよう頼んでいる。" }
    ] },
  { id: "p4-01", part: 4, title: "社内アナウンス：システム更新",
    lines: [
      { s: "N", t: "Good morning, everyone. This is a reminder that our customer database will be upgraded this Saturday. The system will be unavailable from eight A.M. until approximately four P.M. The upgrade will make searching for client records much faster and will allow you to access the database from your mobile devices. Before you leave on Friday, please make sure you save any work in progress, as unsaved changes will be lost. If you have any questions, the IT help desk will be holding a short information session in the cafeteria on Thursday at noon." }
    ],
    questions: [
      { id: "p4-01-1", q: "What is the announcement mainly about?",
        choices: ["A new office policy", "A system upgrade", "A change in work hours", "A cafeteria renovation"], a: 1,
        exp: "冒頭の customer database will be upgraded が主題。" },
      { id: "p4-01-2", q: "What benefit of the change does the speaker mention?",
        choices: ["Lower costs", "Mobile access", "Longer opening hours", "Automatic backups"], a: 1,
        exp: "access the database from your mobile devices。" },
      { id: "p4-01-3", q: "What are listeners asked to do on Friday?",
        choices: ["Attend a session", "Save their work", "Update their passwords", "Leave early"], a: 1,
        exp: "Before you leave on Friday, please make sure you save any work in progress。" }
    ] },
  { id: "p4-02", part: 4, title: "留守番電話メッセージ",
    lines: [
      { s: "N", t: "Hello, this message is for Ms. Alvarez. This is Tom from Greenway Landscaping returning your call about the garden design for your restaurant's patio. I've looked at the photos you sent, and I think we can definitely add the planters and lighting you mentioned. However, the stone path you asked about would need a permit from the city, which usually takes about three weeks. If you'd like to open the patio by the first of June, I'd suggest we start with the planters and lighting and add the path later. Please call me back at 555-0182 so we can schedule a site visit." }
    ],
    questions: [
      { id: "p4-02-1", q: "Who most likely is Ms. Alvarez?",
        choices: ["A city official", "A restaurant owner", "A photographer", "A landscape designer"], a: 1,
        exp: "your restaurant's patio から、レストランの経営者と推測できる。" },
      { id: "p4-02-2", q: "According to the speaker, what requires a permit?",
        choices: ["Outdoor lighting", "A stone path", "Large planters", "Extra seating"], a: 1,
        exp: "the stone path ... would need a permit from the city。" },
      { id: "p4-02-3", q: "What does the speaker suggest?",
        choices: ["Postponing the patio opening", "Completing the project in stages", "Hiring a different contractor", "Sending more photos"], a: 1,
        exp: "先にプランターと照明、小道は後で、という段階的な進め方を提案している。" }
    ] }
];
