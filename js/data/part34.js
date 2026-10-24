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
    ] },
  { id: "p3-04", part: 3, title: "会食の予約変更",
    lines: [
      { s: "W", t: "Hello, I'm calling about a reservation for a business dinner on Friday. It's under the name Hartley, for eight people." },
      { s: "M", t: "Yes, I see it here, Ms. Hartley. Seven-thirty in our private dining room." },
      { s: "W", t: "That's right. Unfortunately, two more colleagues will be joining us. Is the room big enough for ten?" },
      { s: "M", t: "It can seat up to twelve, so that's no problem. Would you like to pre-order from our set menu? It's often easier for larger groups." },
      { s: "W", t: "Yes, that would be great. Could you e-mail me the menu options?" }
    ],
    questions: [
      { id: "p3-04-1", q: "Why is the woman calling?",
        choices: ["To increase the size of a reservation", "To cancel a dinner", "To change a reservation time", "To complain about a meal"], a: 0,
        exp: "参加者が2人増えるので、8人の予約を10人にしたいという電話。" },
      { id: "p3-04-2", q: "What does the man say about the private dining room?",
        choices: ["It can hold up to twelve people.", "It is already booked.", "It has a view of the river.", "It requires a deposit."], a: 0,
        exp: "It can seat up to twelve の言い換え。" },
      { id: "p3-04-3", q: "What will the man most likely do next?",
        choices: ["Send some menu options", "Call the woman's colleagues", "Prepare a bill", "Move the reservation to Saturday"], a: 0,
        exp: "女性がメニューをメールで送るよう頼み、男性がそれに対応すると考えられる。" }
    ] },
  { id: "p3-05", part: 3, title: "サンプルの色違い",
    lines: [
      { s: "M", t: "Akiko, the samples of the new water bottle just arrived from the factory, but the color doesn't match what we approved." },
      { s: "W", t: "Really? The launch event is in three weeks. How different is it?" },
      { s: "M", t: "It's noticeably darker. Our customers will definitely see the difference." },
      { s: "W", t: "Well, the factory did say the new paint supplier might cause some variation." },
      { s: "M", t: "I'll call them this morning and ask them to send another batch using the original paint." },
      { s: "W", t: "Good. And let's push back the photo shoot for the press kit until the corrected samples arrive." }
    ],
    questions: [
      { id: "p3-05-1", q: "What problem does the man report?",
        choices: ["Some samples are the wrong color.", "A shipment was lost.", "A launch event was canceled.", "A factory has closed."], a: 0,
        exp: "the color doesn't match what we approved。" },
      { id: "p3-05-2", q: "Why does the woman say, \"the factory did say the new paint supplier might cause some variation\"?",
        choices: ["To suggest a possible cause of the problem", "To recommend a different factory", "To praise the new supplier", "To explain a delay in payment"], a: 0,
        exp: "意図問題。色が違う原因として、新しい塗料業者の可能性を示している。" },
      { id: "p3-05-3", q: "What does the woman suggest doing?",
        choices: ["Postponing a photo shoot", "Changing the product's color", "Moving the launch date", "Contacting customers"], a: 0,
        exp: "push back the photo shoot = postpone a photo shoot の言い換え。" }
    ] },
  { id: "p3-06", part: 3, title: "採用面接",
    lines: [
      { s: "W", t: "Mr. Barnes, thanks for coming in. Before we start, I'd like to confirm that you'd be available to start in September." },
      { s: "M", t: "Yes, that works. My current contract ends at the end of August." },
      { s: "W", t: "Great. As you know, the position involves managing our online store, and you'd work closely with our warehouse staff in Riverton." },
      { s: "M", t: "I noticed that in the job posting. Would I need to travel there often?" },
      { s: "W", t: "About twice a month. The company covers all travel costs, and you'd be able to use one of our company cars." }
    ],
    questions: [
      { id: "p3-06-1", q: "Where most likely are the speakers?",
        choices: ["At a job interview", "At a car dealership", "At a warehouse", "At a training session"], a: 0,
        exp: "Before we start ... the position involves ... から採用面接の場面。" },
      { id: "p3-06-2", q: "What will the man's job mainly involve?",
        choices: ["Managing an online store", "Driving delivery trucks", "Hiring warehouse staff", "Designing a Web site"], a: 0,
        exp: "the position involves managing our online store。" },
      { id: "p3-06-3", q: "According to the woman, what will the company provide?",
        choices: ["A vehicle for business travel", "A relocation bonus", "Free accommodation", "A new laptop"], a: 0,
        exp: "use one of our company cars = a vehicle の言い換え。" }
    ] },
  { id: "p3-07", part: 3, title: "ソフトウェアの契約更新",
    lines: [
      { s: "M", t: "Hi, Lena. Our subscription to the design software expires next week. Should I renew it for another year?" },
      { s: "W", t: "Actually, I've been comparing it with a newer program. It has most of the same features, and it's about thirty percent cheaper." },
      { s: "M", t: "That sounds promising, but switching would mean training the whole team." },
      { s: "W", t: "True, but the company offers free online training sessions. I've already signed up for a trial so we can test it first." },
      { s: "M", t: "OK. Let's try it on the brochure project and make a decision by Friday." }
    ],
    questions: [
      { id: "p3-07-1", q: "What are the speakers mainly discussing?",
        choices: ["Whether to renew a software subscription", "How to design a brochure", "When to hire new staff", "Where to hold a training session"], a: 0,
        exp: "契約を更新するか、新しいソフトに切り替えるかの相談。" },
      { id: "p3-07-2", q: "What advantage of the newer program does the woman mention?",
        choices: ["It is less expensive.", "It is easier to install.", "It has more features.", "It was recommended by a client."], a: 0,
        exp: "about thirty percent cheaper の言い換え。機能は「ほぼ同じ」なので (C) は誤り。" },
      { id: "p3-07-3", q: "What does the man suggest?",
        choices: ["Testing the program on a current project", "Canceling the trial", "Asking for a discount", "Postponing the brochure project"], a: 0,
        exp: "Let's try it on the brochure project。" }
    ] },
  { id: "p3-08", part: 3, title: "ジムの退会手続き",
    lines: [
      { s: "W", t: "Hi, I'd like to cancel my gym membership. I'm moving to Denver next month." },
      { s: "M", t: "I'm sorry to hear you're leaving. Actually, we have a branch in Denver, on Fifth Avenue. Your membership would be valid there at no extra cost." },
      { s: "W", t: "Oh, I didn't know that. Is it open early in the morning? I usually work out before work." },
      { s: "M", t: "It opens at five A.M. on weekdays. I can transfer your membership right now if you'd like. I'll just need your new address." }
    ],
    questions: [
      { id: "p3-08-1", q: "Why does the woman want to cancel her membership?",
        choices: ["She is relocating.", "The fees have increased.", "She is unhappy with the service.", "She has a new work schedule."], a: 0,
        exp: "I'm moving to Denver = relocating。" },
      { id: "p3-08-2", q: "What does the man tell the woman about?",
        choices: ["Another location of the business", "A special discount", "A new fitness class", "A change in opening hours"], a: 0,
        exp: "デンバーにも支店があることを伝えている。" },
      { id: "p3-08-3", q: "What does the man ask the woman for?",
        choices: ["Her new address", "A membership card", "A cancellation fee", "Her work schedule"], a: 0,
        exp: "I'll just need your new address。" }
    ] },
  { id: "p4-03", part: 4, title: "ラジオの交通情報",
    lines: [
      { s: "N", t: "This is Kelly Ross with your Channel 8 traffic update. If you're heading downtown this morning, expect delays on Highway 9, where one lane is closed for bridge repairs near Exit 14. The work is expected to continue through Thursday, so drivers are advised to use Lakeside Road instead. Also, because of tonight's basketball game at Central Arena, parking near the arena will be limited after five P.M. To help, the city will run extra trains on the Green Line this evening. Stay tuned for the weather forecast after this short break." }
    ],
    questions: [
      { id: "p4-03-1", q: "What is causing delays on Highway 9?",
        choices: ["Bridge repairs", "An accident", "Bad weather", "A sports event"], a: 0,
        exp: "one lane is closed for bridge repairs。" },
      { id: "p4-03-2", q: "What will the city do this evening?",
        choices: ["Provide additional train service", "Close Lakeside Road", "Open a new parking garage", "Offer free bus rides"], a: 0,
        exp: "run extra trains on the Green Line の言い換え。" },
      { id: "p4-03-3", q: "What will listeners most likely hear next?",
        choices: ["Some advertisements", "A sports report", "An interview", "A news summary"], a: 0,
        exp: "after this short break（短い休憩＝CMのあと）に天気予報。つまり次に流れるのは広告。" }
    ] },
  { id: "p4-04", part: 4, title: "工場見学ツアー",
    lines: [
      { s: "N", t: "Welcome to the Hollis Chocolate Factory tour. My name is Martin, and I'll be your guide for the next hour. We'll begin in the roasting room, where the cocoa beans are prepared, and finish in our tasting room, where you can sample five of our most popular flavors. Please note that photography is not permitted inside the production area to protect our recipes. Also, for safety reasons, everyone must wear the hairnet you were given at the entrance. At the end of the tour, you'll each receive a coupon for fifteen percent off any purchase at our gift shop." }
    ],
    questions: [
      { id: "p4-04-1", q: "Who most likely is the speaker?",
        choices: ["A tour guide", "A store manager", "A chef", "A safety inspector"], a: 0,
        exp: "I'll be your guide for the next hour。" },
      { id: "p4-04-2", q: "What are listeners asked not to do?",
        choices: ["Take pictures in the production area", "Eat in the tasting room", "Remove their hairnets outside", "Touch the cocoa beans"], a: 0,
        exp: "photography is not permitted inside the production area。" },
      { id: "p4-04-3", q: "What will listeners receive at the end of the tour?",
        choices: ["A discount coupon", "A box of chocolates", "A recipe book", "A free drink"], a: 0,
        exp: "a coupon for fifteen percent off の言い換え。" }
    ] },
  { id: "p4-05", part: 4, title: "会議：顧客アンケートの結果",
    lines: [
      { s: "N", t: "Before we finish today's meeting, I want to share the results of our customer survey. Overall satisfaction with our delivery service rose to eighty-five percent, up from seventy-two percent last year. Customers especially appreciated the new text-message updates that tell them when their package will arrive. However, many people commented that our return process is too complicated. So starting next month, customers will be able to print return labels directly from our Web site. I'd like each team leader to explain this change to their staff by the end of the week." }
    ],
    questions: [
      { id: "p4-05-1", q: "What has improved, according to the speaker?",
        choices: ["Customer satisfaction with deliveries", "The speed of the Web site", "The number of employees", "Product prices"], a: 0,
        exp: "satisfaction with our delivery service rose to eighty-five percent。" },
      { id: "p4-05-2", q: "What did many customers complain about?",
        choices: ["The return process", "Text-message updates", "Delivery times", "Packaging"], a: 0,
        exp: "our return process is too complicated。text-message updates は好評だった点。" },
      { id: "p4-05-3", q: "What are team leaders asked to do?",
        choices: ["Inform their staff about a change", "Conduct another survey", "Print return labels", "Contact unhappy customers"], a: 0,
        exp: "explain this change to their staff の言い換え。" }
    ] }
];
