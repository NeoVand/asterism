# Probe: connect

## User
How does the winter recording issue connect to the statistics on how many trials we need?

<details><summary>8 tool calls · 24s</summary>

- read_file {"file_path":"/skills/graph-research/SKILL.md","limit":1000,"offset":0}
- search_graph {"query":"winter recording","limit":8}
- search_graph {"query":"zero failures trials confidence","limit":8}
- search_graph {"query":"winter statistical independence","limit":8}
- explore {"id":"t209","limit":35}
- explore {"id":"t121","limit":30}
- search_graph {"query":"missing winter","chapters":[13,0],"limit":12}
- read_facts {"ids":["f97","f10461","f126","f221","f222","f130","f6654","f8182","f8218","f11102","f519","f5573","f335","f129","f2879","f6992"]}
</details>

## Agent
**The winter issue is about having the right evidence; the trial-count issue is about having enough of it.** Thousands of trials cannot substantiate winter performance if winter conditions are absent from the data or inadequately represented in the simulation. Large simulated samples do not remove model-form uncertainty. [f11102, f8182, f8218]

### Why recording cannot wait
The booklet recommends recording from **October 2026 through winter 2026–27**, rather than waiting for the braking prototype. Its skeptic’s review identifies that winter as the last opportunity to collect snow and cold data before the planned mid-2027-plus-four-month validation window. Recording candidate development sensors alongside the existing warning system captures that seasonal distribution. [f97, f10461, f5573]

### How that affects the trial numbers
The zero-miss requirements at **95% confidence** are **per claimed population**, not a single total that automatically covers every weather condition: [f126, f221, f222]

- **299 independent encounters** for a miss rate no greater than **1%**. [f126]
- **2,995** for **0.1%**. [f221]
- **29,956** for **0.01%**. [f222]

If you want a separate winter-performance claim, the winter population needs evidence supporting that claim; summer encounters do not establish the requested real-data performance in snow. The review expects detection and false-positive rates, with confidence intervals, **for each environmental condition bin**, including snow. As an illustration of this multiplication, the booklet gives about **6,000 zero-miss trials** for a 1% claim in each of 20 critical strata—not a simultaneous 95% guarantee across all strata. [f11102, f6654]

### Why hours of video are not thousands of trials
The statistical unit is an **independent encounter**, not a sensor frame. Recording a winter encounter at high frame rate does not turn it into hundreds of independent trials. And winter recordings used to tune thresholds must be kept separate from the untouched audit data used to judge the finished system. [f130, f6992]

The same representativeness problem applies to nuisance braking: the booklet calls for **300 representative operating hours with no unnecessary brakes** to support fewer than one unnecessary brake per 100 hours. A winter-inclusive claim therefore needs representative exposure, not just a large volume of convenient recordings. [f129, f11102]

**Bottom line:** capture winter now to establish and check the conditions the tests must represent; use simulation or hardware-in-the-loop to achieve the required trial volume. Neither replaces the other, and the booklet found no public authoritative off-road answer for statistical weather/site generalisation. [f97, f5573, f6654, f8182, f2879]

## User
Is there any tension between what the regulations require and what the vendors claim?

<details><summary>13 tool calls · 57s</summary>

- search_graph {"query":"virtual validation collision mitigation","limit":12}
- explore {"id":"c3","limit":25}
- explore {"id":"c13","limit":25}
- explore {"id":"c0","limit":20}
- explore {"id":"t127","limit":12}
- search_graph {"query":"vendor claims certification simulation","chapters":[3,13],"limit":16}
- search_graph {"query":"vendor compliance ISO 21815","limit":10}
- search_graph {"query":"self-evolving Pilz TÜV","chapters":[3,13],"limit":10}
- search_graph {"query":"vendor unsupported Ansys NVIDIA certification","chapters":[13,11],"limit":12}
- explore {"id":"e6","limit":6}
- read_facts {"ids":["f2103","f10410","f10411","f10414","f10419","f10420","f10431","f10435","f10436","f10438","f11166","f11167","f2367","f2368","f2090","
- read_facts {"ids":["f7544","f10738","f11237","f2171","f1710","f2078","f2884","f2888","f2887","f11311"]}
- read_facts {"ids":["f2103","f7544","f11237","f10431","f194","f10435","f10420","f2078","f2080","f2081","f2857","f2090","f2367","f2368","f11187","f2062",
</details>

## Agent
- **Acceptance gap — Independent/gap:** Ch3’s strong “no replacement” wording is qualified by Ch10: full paid standards were unavailable, so simulation acceptance **not found** is not proof of prohibition; Ch13 retains that gap [f2103, f7544, f11237].
- **Physical evidence versus virtual capability — Independent/on-road:** EU Regulation 2022/1426 requires a documented simulation credibility envelope and says simulation shall not substitute for physical tests; this is an on-road precedent, not off-road approval [f10410, f10411].
- **Brake compliance versus simulator claims — Independent:** ISO 3450:2011 requires physical brake-performance testing; the synthesis finds no commercial or open-source tool publicly demonstrated across many earth-moving site types and all-weather sensing [f10431, f194].
- **Warning baseline versus braking acceptance — Independent:** ISO 19014-2’s second edition, under publication in October 2026, excludes awareness-only systems but covers motion-affecting safety controls; equivalence to an old warning system cannot establish braking-function conformity [f10419].
- **Broad deployment versus vendor envelope — Vendor:** Volvo CE’s January 2023 CMS is reverse-only, 3–15 km/h, brakes for 2–3 seconds, and covers named loader models; documented Volvo/Komatsu/Caterpillar launches are narrow, not evidence for unrestricted heavy-machine transfer [f10435, f10436, f10438, f11166].
- **Collision prevention versus intervention-created hazards — Vendor/Expert:** Komatsu advises disabling stop control on slopes, slippery/soft ground, suspended loads and trailer loading; experts identify no accepted missed-collision/nuisance-braking trade-off [f10420, f2884].
- **Legal duty versus missing numerical acceptance — Independent:** South African mining rules commenced 21 December 2022 and require fail-to-safe without human intervention, yet prescribe no detection percentage, distance, false-alarm limit or stopping-distance test; vendor performance numbers cannot be presented as those statutory thresholds [f2078, f2080, f2081].
- **Frozen ML classification — Independent versus Expert/snippet:** Machinery Regulation 2023/1230 applies from 20 January 2027 and requires notified-body involvement for listed self-evolving ML safety functions; Intertek’s 25 September 2025 snippet includes frozen models, other commentators limit scope to in-service adaptation, and notified-body positions were not found [f2857, f2090, f2367, f2368, f11187].
- **Standards branding versus legal obligation — Independent:** ISO 21815 is not itself law; binding force depends on legislation, designation, contracts or the chosen conformity route, limiting what vendor “standards compliance” language establishes [f2062].
- **Internal scope contradiction — Independent:** ISO 21815-4, under publication in October 2026, is described in Ch3 as covering pre-rotation inhibition but in Ch2 as excluding avoidance by braking “or inhibit”; both agree automatic braking is outside scope [f2171, f1710].
- **Schedule/business case versus precedent — Synthesis gap/finding:** No case establishes accepted validation of a new automatic-braking function about four months after representative hardware; documented physical-test reductions required years of prior investment or narrow envelopes, and Ch13 explicitly recommends discounting vendor business-case claims [f58, f59, f10738].

Tensions:
- The booklet’s strongest categorical simulation claims exceed its documented access to normative texts; preserve “not found,” rather than “prohibited” [f2103, f7544, f11237].
- Vendor deployment restrictions are useful evidence of scope limits, not independent proof of efficacy or regulatory acceptance [f11166, f11167].
- On-road cost rhetoric is especially weak for transfer: VBOX’s US$63 billion contrast with NHTSA’s US$354.06 million annual estimate was snippet-only and vendor-labelled; NHTSA’s figures use 2020 dollars [f2888, f2887].

Also relevant:
- Glossary frames simulation as prioritizing scarce physical tests and multiplying surrounding evidence, rather than replacing them [f11311].
- Ch13 records missing organizational credibility foundations, but this is a programme gap, not a vendor-independent audit [f10414].**Yes—but the tension is mostly between what vendors demonstrate and what a compliance argument must establish, not evidence that vendors are breaking the rules.** The booklet found no tool publicly demonstrated to validate automatic braking across many earth-moving site types and all-weather sensing; documented reductions in physical testing depended on years of prior investment, narrow operating envelopes, or both. [f194, f59]

### 1. Virtual capability is not regulatory acceptance
ISO 3450 requires **physical brake-performance testing**. The booklet did not establish that the relevant off-road standards accept simulation as a replacement for prescribed physical tests. Importantly, the full paid texts were not all checked: **“acceptance not found” does not mean “simulation prohibited.”** A vendor’s simulation capability therefore should not be presented as an established compliance route. [f10431, f11237, f7544]

### 2. Product claims have narrower envelopes than “all-weather safety”
The vendor material itself contains important restrictions:

- **Volvo CE’s January 2023 system:** reverse-only, at **3–15 km/h**. [f10435]
- **Komatsu stop control:** customers are advised to disable it on slopes, slippery or soft ground, with suspended loads, and when loading trailers. [f10420]

These are **vendor-reported operating limits**, not independent proof of effectiveness. They make the winter issue particularly relevant: a deployment claim cannot simply be extended to snow, slippery ground, or other excluded conditions. [f10435, f10420]

### 3. A warning-system baseline is not a braking safety case
ISO 19014-2’s second edition, under publication in October 2026, distinguishes motion-affecting safety controls from awareness-only systems, which it expressly excludes. Consequently, showing that a braking system matches an existing warning system’s detection performance does not by itself establish conformity for automatic intervention. [f10419]

### 4. Regulations can demand safe outcomes without supplying the trial target
South Africa’s relevant mining provisions commenced on **21 December 2022** and require the system to **“fail to safe without human intervention.”** But they specify no detection percentage, detection distance, false-alarm limit, or stopping-distance test. Vendor performance numbers therefore cannot simply be treated as statutory acceptance thresholds. [f2078, f2080, f2081]

Likewise, **ISO 21815 is not itself law**; its binding force depends on legislation, designation, contracts, or the manufacturer’s conformity route. “Standards compliant” and “legally accepted for this application” are different claims. [f2062]

### 5. Even the EU classification has an unresolved interpretation
The EU Machinery Regulation applies from **20 January 2027**. Its Annex I Part A requires notified-body involvement for listed safety functions using fully or partially self-evolving machine-learning behaviour. [f2857, f2090]

Whether that includes a **frozen, non-learning deployed model** is disputed: an Intertek commentary says yes, while other commentators restrict the clause to behaviour that changes in service. These are expert interpretations—the Intertek statement was available only as a search snippet—and the booklet found no notified-body position resolving the question. [f2367, f2368, f11187]

**The practical distinction is capability versus acceptance:** vendor evidence can support a bounded technical claim, but it does not automatically establish legal conformity, a statistical performance threshold, or validity outside the demonstrated operating envelope. [f194, f2062, f2081, f10435, f10420]

## User
Debrief, honestly and briefly: in this conversation, what confused you or slowed you down? Which tool results were unclear, missing, too long or misleading, and what tool or information would have let you answer better? Do not use tools for this.

<details><summary>0 tool calls · 7s</summary>


</details>

## Agent
- **“Winter recording issue” was initially ambiguous.** I had to establish whether you meant seasonal coverage, recording quality, or timing. The graph ultimately pointed to capturing winter 2026–27 before the planned validation window.
- **The hub results were useful but unwieldy.** They reported hundreds of linked facts while showing only selected ones. A compact, question-specific view connecting winter coverage, independent encounters, and per-population sample sizes would have been faster.
- **The regulation evidence contained a genuine wording tension.** One result said simulation cannot replace prescribed physical tests; another cautioned that full standards were unavailable and “not found” does not mean “prohibited.” That qualification was essential.
- **The delegated regulatory report was broader than needed.** It mixed legal requirements, standards, vendor restrictions, interpretation disputes, and schedule claims. I had to separate them before answering.
- **What would help most:** access to the relevant normative clauses and a verified comparison of vendor claims against their precise operating limits and acceptance evidence.

**My own weakness:** the second answer was longer and broader than your follow-up needed. I also should have labelled the winter-specific trial-count connection more explicitly as an inference from per-population claims, rather than implying a prescribed off-road winter sample size.
