/* ---------------------------------------------------------
   cities/delhi/city.js — what is true of Delhi.

   The third pack, and the one that adds a capability the engine did not
   have: air. Paris ranks against the weather, Bengaluru against the
   clock, Delhi against both plus what is in the air, because for six to
   eight weeks a year that is the fact the day is organised around.

   What this pack deliberately does NOT do is hide things. See `air`
   below — the reasoning is there rather than here because it is the
   single most important judgement in the file.
   --------------------------------------------------------- */

const City = (() => {

  const id   = 'delhi';
  const name = 'Delhi';

  const ua = 'homeground-delhi (personal site)';

  /* ---------- what a piece of the city is called ----------

     A colony. Not a district and never a ward — people say "GK-1",
     "Hauz Khas", "Shahpur Jat", "Defence Colony", and the block within
     it ("M Block", "N Block") the way Bengaluru says Main and Cross.
     That block grammar belongs to a record's own area line.

     Two hundred and sixty-odd from OpenStreetMap's place=suburb nodes,
     plus three added by hand: Chandni Chowk is tagged neighbourhood
     rather than suburb, and Gurugram and Noida sit outside Delhi's
     administrative boundary altogether.

     That last one is the important one. **NCR is in the zone model, not
     in Away.** Gurugram, Noida, Ghaziabad, Faridabad and Greater Noida
     are all zones here, and Cyber City and Sohna Road are named
     separately because Gurugram is really two places and people say
     which.** Half of anybody's Delhi happens in Gurugram or Noida —
     the office, the friends, the mall somebody actually goes to — and a
     guide that files them under day trips has misunderstood the city.
     They are twenty kilometres out, which in Delhi terms is nearer than
     Old Delhi on a weekday evening. */

  const zone = {
    one:  'colony',
    many: 'colonies',
    label: k => (zone.names[k] || k),
    display: (k, nm) => (nm || zone.names[k] || name),
    fallback: name,
    allHeading: 'Every colony',
    tile: k => (zone.names[k] || k),

    centroids: {
      'chandni-chowk': [28.65598, 77.23219],
      'ghaziabad': [28.77500, 77.45870],
      'faridabad': [28.40315, 77.31056],
      'greater-noida': [28.46707, 77.51376],
      'cyber-city': [28.49807, 77.08926],
      'sohna-road': [28.39994, 77.04527],
      'gurugram': [28.46461, 77.02992],
      'noida': [28.57063, 77.32721],
      'alaknanda': [28.52934, 77.25163],
      'anand-parbat': [28.66023, 77.17041],
      'anand-vihar': [28.64111, 77.3125],
      'anangpur': [28.46252, 77.26884],
      'andrews-ganj': [28.56511, 77.22802],
      'ashok-vihar': [28.68852, 77.17393],
      'ashok-vihar-phase-iii-extension': [28.49672, 77.02744],
      'asola': [28.45305, 77.18477],
      'azadpur': [28.70766, 77.17555],
      'babarpur': [28.68743, 77.27976],
      'badarpur': [28.49421, 77.30686],
      'badkhal': [28.40729, 77.28302],
      'badli': [28.73375, 77.144],
      'begampur': [28.72671, 77.06493],
      'begum-pur': [28.7255, 77.05837],
      'bhajanpura': [28.70094, 77.26178],
      'bhalswa': [28.7455, 77.15883],
      'central-vista': [28.61345, 77.21853],
      'chanakyapuri': [28.59468, 77.18852],
      'chattarpur-farms': [28.48051, 77.16725],
      'chhattarpur': [28.50385, 77.18303],
      'chhawla': [28.5623, 77.00371],
      'chilla': [28.58473, 77.30219],
      'chirag-delhi': [28.53814, 77.22807],
      'chittaranjan-park': [28.53769, 77.25165],
      'civil-lines': [28.68069, 77.2226],
      'connaught-place': [28.63177, 77.21938],
      'defence-colony': [28.57136, 77.23304],
      'dhaula-kuan': [28.59488, 77.16226],
      'dilshad-garden': [28.68068, 77.32206],
      'dwarka': [28.60072, 77.04294],
      'gandhi-nagar': [28.65879, 77.27159],
      'geeta-colony': [28.65109, 77.275],
      'gharoli': [28.61659, 77.33199],
      'ghazipur': [28.63026, 77.32032],
      'gopal-nagar': [28.61214, 76.96978],
      'govindpuri': [28.53516, 77.26379],
      'goyla-khurd': [28.58572, 77.01019],
      'greater-kailash': [28.55585, 77.24383],
      'green-park': [28.55644, 77.20387],
      'hans-enclave': [28.44537, 77.02576],
      'hari-nagar': [28.62965, 77.11193],
      'harola': [28.58761, 77.31901],
      'hastsal': [28.63596, 77.04876],
      'hauz-khas': [28.5536, 77.19481],
      'iffco-chowk': [28.47243, 77.07224],
      'indraprastha-extension': [28.63052, 77.30676],
      'jahangir-puri': [28.73017, 77.16791],
      'jamia-nagar': [28.56873, 77.28483],
      'janakpuri': [28.62193, 77.08748],
      'jasola-vihar': [28.54274, 77.29133],
      'kalkaji': [28.54695, 77.2588],
      'kalyan-puri': [28.61593, 77.31764],
      'kamla-nagar': [28.68068, 77.20395],
      'kanjhawala': [28.73582, 77.00432],
      'kapashera': [28.52729, 77.0823],
      'karkarduma': [28.65215, 77.30144],
      'karol-bagh': [28.653, 77.18902],
      'kaushambi': [28.64235, 77.32264],
      'khaira': [28.59642, 76.96865],
      'khajuri': [28.70678, 77.25924],
      'khora': [28.62625, 77.34658],
      'kidwai-nagar': [28.57242, 77.20786],
      'kirti-nagar': [28.65328, 77.14177],
      'kishangarh': [28.51943, 77.16654],
      'lado-sarai': [28.52543, 77.19207],
      'lajpat-nagar': [28.56609, 77.24329],
      'laxmi-nagar': [28.63602, 77.27513],
      'lodhi-colony': [28.5862, 77.22686],
      'lok-nayak-puram': [28.66316, 77.01146],
      'mahavir-enclave': [28.60003, 77.07898],
      'maidan-garhi': [28.49877, 77.19445],
      'majnu-ka-tila': [28.69868, 77.22601],
      'malviya-nagar': [28.53392, 77.21245],
      'mamura': [28.60362, 77.37549],
      'mayapuri': [28.62528, 77.12097],
      'mayur-vihar': [28.60986, 77.29263],
      'mehrauli': [28.52183, 77.17832],
      'model-town': [28.70733, 77.18852],
      'moti-bagh': [28.58192, 77.1728],
      'moti-nagar': [28.66173, 77.13961],
      'mundka': [28.68193, 77.03081],
      'naharpur-rupa': [28.44585, 77.02098],
      'nand-nagari': [28.69752, 77.3068],
      'nangloi': [28.68278, 77.06702],
      'nangloi-extension': [28.67831, 77.05135],
      'naraina': [28.62646, 77.13497],
      'naraina-village': [28.62205, 77.13864],
      'nawada': [28.62435, 77.0412],
      'neb-sarai': [28.5055, 77.2015],
      'netaji-nagar': [28.57403, 77.18482],
      'new-ashok-nagar': [28.59356, 77.30813],
      'new-colony': [28.46626, 77.01427],
      'new-friends-colony': [28.5671, 77.26976],
      'nithari': [28.57621, 77.34222],
      'nizamuddin': [28.59094, 77.24233],
      'noble-enclave': [28.50092, 77.06213],
      'noida-city-centre': [28.57529, 77.35542],
      'north-campus': [28.6891, 77.21347],
      'okhla': [28.55972, 77.27808],
      'old-delhi': [28.65905, 77.22759],
      'old-faridabad': [28.4235, 77.32404],
      'om-nagar': [28.45003, 77.02116],
      'paharganj': [28.6415, 77.21406],
      'palam': [28.59189, 77.08282],
      'palam-vihar-extension': [28.50077, 77.0399],
      'paprawat': [28.58813, 76.97818],
      'paschim-vihar': [28.66958, 77.09596],
      'pasonda': [28.69443, 77.3571],
      'patel-nagar': [28.64962, 77.16436],
      'pitampura': [28.69951, 77.1301],
      'preet-vihar': [28.63538, 77.28993],
      'punjabi-bagh': [28.67139, 77.14072],
      'qutub-vihar': [28.57487, 77.0274],
      'raisina-hill': [28.61415, 77.20405],
      'raj-nagar': [28.44803, 77.01804],
      'raj-nagar-ii': [28.58175, 77.0873],
      'rajendra-nagar': [28.63973, 77.18341],
      'rajouri-garden': [28.64511, 77.12393],
      'ramakrishna-puram': [28.56569, 77.17465],
      'rohini': [28.71621, 77.11707],
      'sadar-bazar': [28.65977, 77.21163],
      'safdarjung-enclave': [28.56502, 77.19256],
      'sahibabad': [28.67228, 77.37001],
      'sahibabad-industrial-area': [28.66585, 77.35115],
      'sainik-farms': [28.50678, 77.21857],
      'saket': [28.52441, 77.21373],
      'samalkha': [28.53461, 77.08949],
      'sangam-vihar': [28.50571, 77.24847],
      'sarai-rohilla': [28.66787, 77.19027],
      'sarita-vihar': [28.53348, 77.29352],
      'sarojini-nagar': [28.57448, 77.19631],
      'satbari': [28.48297, 77.18732],
      'sector-1': [28.51752, 77.04257],
      'sector-10': [28.45399, 77.00253],
      'sector-100': [28.46139, 76.97127],
      'sector-101': [28.46841, 76.98038],
      'sector-102': [28.47549, 76.97117],
      'sector-102a': [28.48308, 76.97791],
      'sector-103': [28.49309, 76.98665],
      'sector-104': [28.47953, 76.99372],
      'sector-105': [28.49431, 77.00814],
      'sector-106': [28.50608, 76.99678],
      'sector-107': [28.50694, 76.97521],
      'sector-108': [28.5129, 76.98236],
      'sector-109': [28.51092, 77.0066],
      'sector-10a': [28.44458, 77.00602],
      'sector-11': [28.45223, 77.02672],
      'sector-110': [28.50696, 77.01832],
      'sector-110a': [28.51591, 77.02765],
      'sector-111': [28.52228, 77.03362],
      'sector-11a': [28.45749, 77.03254],
      'sector-12': [28.46407, 77.02597],
      'sector-12a': [28.4701, 77.03154],
      'sector-13': [28.4746, 77.03672],
      'sector-14': [28.47378, 77.04718],
      'sector-15-i': [28.45299, 77.03763],
      'sector-15-ii': [28.46145, 77.04601],
      'sector-16': [28.46873, 77.05118],
      'sector-17': [28.4758, 77.06078],
      'sector-18': [28.49135, 77.07103],
      'sector-19': [28.50309, 77.08175],
      'sector-2': [28.50905, 77.03428],
      'sector-20': [28.51077, 77.08476],
      'sector-21': [28.51436, 77.07301],
      'sector-22': [28.50632, 77.06552],
      'sector-23': [28.51032, 77.05301],
      'sector-23a': [28.50569, 77.0463],
      'sector-24': [28.49448, 77.1013],
      'sector-25': [28.48609, 77.08422],
      'sector-25a': [28.49612, 77.09065],
      'sector-26': [28.47794, 77.10324],
      'sector-26a': [28.47039, 77.09931],
      'sector-27': [28.46466, 77.08395],
      'sector-28': [28.47413, 77.08257],
      'sector-29': [28.46692, 77.06713],
      'sector-3': [28.49739, 77.02053],
      'sector-30': [28.46187, 77.05688],
      'sector-31': [28.454, 77.04972],
      'sector-32': [28.4458, 77.04132],
      'sector-33': [28.43848, 77.02517],
      'sector-34': [28.428, 77.01157],
      'sector-35': [28.41457, 77.00187],
      'sector-36': [28.41933, 76.98893],
      'sector-36a': [28.42023, 76.972],
      'sector-36b': [28.42898, 76.96822],
      'sector-37': [28.43427, 76.99929],
      'sector-37a': [28.44166, 76.99191],
      'sector-37b': [28.43332, 76.98134],
      'sector-37c': [28.44891, 76.98805],
      'sector-37d': [28.448, 76.96977],
      'sector-38': [28.43514, 77.04035],
      'sector-39': [28.44237, 77.05047],
      'sector-3a': [28.48095, 77.00908],
      'sector-4': [28.47501, 77.01035],
      'sector-40': [28.45004, 77.05771],
      'sector-41': [28.45692, 77.0646],
      'sector-42': [28.4559, 77.10848],
      'sector-43': [28.45487, 77.08589],
      'sector-44': [28.45071, 77.07383],
      'sector-45': [28.4449, 77.06635],
      'sector-46': [28.43591, 77.0584],
      'sector-47': [28.42516, 77.04751],
      'sector-48': [28.41049, 77.03946],
      'sector-49': [28.41289, 77.04984],
      'sector-5': [28.48039, 77.01909],
      'sector-50': [28.41665, 77.06117],
      'sector-51': [28.4287, 77.06669],
      'sector-52': [28.43682, 77.07953],
      'sector-52a': [28.43962, 77.09059],
      'sector-53': [28.44152, 77.09681],
      'sector-54': [28.44211, 77.11127],
      'sector-55': [28.42742, 77.10975],
      'sector-56': [28.42532, 77.09852],
      'sector-57': [28.42325, 77.08045],
      'sector-58': [28.416, 77.10856],
      'sector-59': [28.40302, 77.10667],
      'sector-6': [28.47533, 77.02583],
      'sector-61': [28.41102, 77.09637],
      'sector-62': [28.4077, 77.08238],
      'sector-65': [28.40302, 77.06959],
      'sector-71': [28.40646, 77.02331],
      'sector-72': [28.41593, 77.02908],
      'sector-72a': [28.42332, 77.01878],
      'sector-73': [28.40881, 77.01617],
      'sector-74': [28.41101, 77.01012],
      'sector-74a': [28.41085, 76.99912],
      'sector-75a': [28.40045, 76.99445],
      'sector-8': [28.4599, 77.0198],
      'sector-84': [28.40823, 76.96302],
      'sector-85': [28.40365, 76.95314],
      'sector-88': [28.42196, 76.95681],
      'sector-88a': [28.43379, 76.95394],
      'sector-88b': [28.44202, 76.95385],
      'sector-9': [28.46218, 77.00007],
      'sector-99': [28.46455, 76.96286],
      'sector-99a': [28.45541, 76.95103],
      'sector-9a': [28.46903, 76.99628],
      'sector-9b': [28.45638, 76.98101],
      'seelampur': [28.67065, 77.26436],
      'shahdara': [28.6773, 77.29035],
      'shaheen-bagh': [28.54664, 77.30081],
      'shahpur-jat': [28.54833, 77.2141],
      'shakarpur': [28.62808, 77.27938],
      'shalimar-bagh': [28.70813, 77.16119],
      'shivaji-nagar': [28.45528, 77.02379],
      'shyam-vihar': [28.59172, 77.00009],
      'south-dwarka': [28.53144, 77.01494],
      'south-extension': [28.56811, 77.22219],
      'sultanpuri': [28.69966, 77.06628],
      'surajkund': [28.48594, 77.2846],
      'surya-nagar': [28.66852, 77.3307],
      'tilak-nagar': [28.64043, 77.09184],
      'trilok-puri': [28.60668, 77.30878],
      'tughlakabad': [28.51263, 77.26703],
      'uttam-nagar': [28.62152, 77.06111],
      'vaishali': [28.64716, 77.33469],
      'vasant-kunj': [28.52925, 77.15413],
      'vasant-vihar': [28.56029, 77.16285],
      'vasundhara': [28.66197, 77.3733],
      'vikaspuri': [28.63864, 77.07314],
      'vivek-vihar': [28.66803, 77.31947],
      'wazirabad': [28.72976, 77.22128],
      'yamuna-vihar': [28.70037, 77.27277]
    },

    names: {
      'chandni-chowk': 'Chandni Chowk',
      'ghaziabad': 'Ghaziabad',
      'faridabad': 'Faridabad',
      'greater-noida': 'Greater Noida',
      'cyber-city': 'Cyber City',
      'sohna-road': 'Sohna Road',
      'gurugram': 'Gurugram',
      'noida': 'Noida',
      'alaknanda': 'Alaknanda',
      'anand-parbat': 'Anand Parbat',
      'anand-vihar': 'Anand Vihar',
      'anangpur': 'Anangpur',
      'andrews-ganj': 'Andrews Ganj',
      'ashok-vihar': 'Ashok Vihar',
      'ashok-vihar-phase-iii-extension': 'Ashok Vihar Phase III Extension',
      'asola': 'Asola',
      'azadpur': 'Azadpur',
      'babarpur': 'Babarpur',
      'badarpur': 'Badarpur',
      'badkhal': 'Badkhal',
      'badli': 'Badli',
      'begampur': 'Begampur',
      'begum-pur': 'Begum Pur',
      'bhajanpura': 'Bhajanpura',
      'bhalswa': 'Bhalswa',
      'central-vista': 'Central Vista',
      'chanakyapuri': 'Chanakyapuri',
      'chattarpur-farms': 'Chattarpur Farms',
      'chhattarpur': 'Chhattarpur',
      'chhawla': 'Chhawla',
      'chilla': 'Chilla',
      'chirag-delhi': 'Chirag Delhi',
      'chittaranjan-park': 'Chittaranjan Park',
      'civil-lines': 'Civil Lines',
      'connaught-place': 'Connaught Place',
      'defence-colony': 'Defence Colony',
      'dhaula-kuan': 'Dhaula Kuan',
      'dilshad-garden': 'Dilshad Garden',
      'dwarka': 'Dwarka',
      'gandhi-nagar': 'Gandhi Nagar',
      'geeta-colony': 'Geeta Colony',
      'gharoli': 'Gharoli',
      'ghazipur': 'Ghazipur',
      'gopal-nagar': 'Gopal Nagar',
      'govindpuri': 'Govindpuri',
      'goyla-khurd': 'Goyla Khurd',
      'greater-kailash': 'Greater Kailash',
      'green-park': 'Green Park',
      'hans-enclave': 'Hans Enclave',
      'hari-nagar': 'Hari Nagar',
      'harola': 'Harola',
      'hastsal': 'Hastsal',
      'hauz-khas': 'Hauz Khas',
      'iffco-chowk': 'IFFCO Chowk',
      'indraprastha-extension': 'Indraprastha Extension',
      'jahangir-puri': 'Jahangir Puri',
      'jamia-nagar': 'Jamia Nagar',
      'janakpuri': 'Janakpuri',
      'jasola-vihar': 'Jasola Vihar',
      'kalkaji': 'Kalkaji',
      'kalyan-puri': 'Kalyan Puri',
      'kamla-nagar': 'Kamla Nagar',
      'kanjhawala': 'Kanjhawala',
      'kapashera': 'Kapashera',
      'karkarduma': 'Karkarduma',
      'karol-bagh': 'Karol Bagh',
      'kaushambi': 'Kaushambi',
      'khaira': 'Khaira',
      'khajuri': 'Khajuri',
      'khora': 'Khora',
      'kidwai-nagar': 'Kidwai Nagar',
      'kirti-nagar': 'Kirti Nagar',
      'kishangarh': 'Kishangarh',
      'lado-sarai': 'Lado Sarai',
      'lajpat-nagar': 'Lajpat Nagar',
      'laxmi-nagar': 'Laxmi Nagar',
      'lodhi-colony': 'Lodhi Colony',
      'lok-nayak-puram': 'Lok Nayak Puram',
      'mahavir-enclave': 'Mahavir Enclave',
      'maidan-garhi': 'Maidan Garhi',
      'majnu-ka-tila': 'Majnu Ka Tila',
      'malviya-nagar': 'Malviya Nagar',
      'mamura': 'Mamura',
      'mayapuri': 'Mayapuri',
      'mayur-vihar': 'Mayur Vihar',
      'mehrauli': 'Mehrauli',
      'model-town': 'Model Town',
      'moti-bagh': 'Moti Bagh',
      'moti-nagar': 'Moti Nagar',
      'mundka': 'Mundka',
      'naharpur-rupa': 'Naharpur Rupa',
      'nand-nagari': 'Nand Nagari',
      'nangloi': 'Nangloi',
      'nangloi-extension': 'Nangloi Extension',
      'naraina': 'Naraina',
      'naraina-village': 'Naraina Village',
      'nawada': 'Nawada',
      'neb-sarai': 'Neb Sarai',
      'netaji-nagar': 'Netaji Nagar',
      'new-ashok-nagar': 'New Ashok Nagar',
      'new-colony': 'New Colony',
      'new-friends-colony': 'New Friends Colony',
      'nithari': 'Nithari',
      'nizamuddin': 'Nizamuddin',
      'noble-enclave': 'Noble Enclave',
      'noida-city-centre': 'Noida City Centre',
      'north-campus': 'North Campus',
      'okhla': 'Okhla',
      'old-delhi': 'Old Delhi',
      'old-faridabad': 'Old Faridabad',
      'om-nagar': 'Om Nagar',
      'paharganj': 'Paharganj',
      'palam': 'Palam',
      'palam-vihar-extension': 'Palam Vihar Extension',
      'paprawat': 'Paprawat',
      'paschim-vihar': 'Paschim Vihar',
      'pasonda': 'Pasonda',
      'patel-nagar': 'Patel Nagar',
      'pitampura': 'Pitampura',
      'preet-vihar': 'Preet Vihar',
      'punjabi-bagh': 'Punjabi Bagh',
      'qutub-vihar': 'Qutub Vihar',
      'raisina-hill': 'Raisina Hill',
      'raj-nagar': 'Raj Nagar',
      'raj-nagar-ii': 'Raj Nagar II',
      'rajendra-nagar': 'Rajendra Nagar',
      'rajouri-garden': 'Rajouri Garden',
      'ramakrishna-puram': 'Ramakrishna Puram',
      'rohini': 'Rohini',
      'sadar-bazar': 'Sadar Bazar',
      'safdarjung-enclave': 'Safdarjung Enclave',
      'sahibabad': 'Sahibabad',
      'sahibabad-industrial-area': 'Sahibabad Industrial Area',
      'sainik-farms': 'Sainik Farms',
      'saket': 'Saket',
      'samalkha': 'Samalkha',
      'sangam-vihar': 'Sangam Vihar',
      'sarai-rohilla': 'Sarai Rohilla',
      'sarita-vihar': 'Sarita Vihar',
      'sarojini-nagar': 'Sarojini Nagar',
      'satbari': 'Satbari',
      'sector-1': 'Sector 1',
      'sector-10': 'Sector 10',
      'sector-100': 'Sector 100',
      'sector-101': 'Sector 101',
      'sector-102': 'Sector 102',
      'sector-102a': 'Sector 102A',
      'sector-103': 'Sector 103',
      'sector-104': 'Sector 104',
      'sector-105': 'Sector 105',
      'sector-106': 'Sector 106',
      'sector-107': 'Sector 107',
      'sector-108': 'Sector 108',
      'sector-109': 'Sector 109',
      'sector-10a': 'Sector 10A',
      'sector-11': 'Sector 11',
      'sector-110': 'Sector 110',
      'sector-110a': 'Sector 110A',
      'sector-111': 'Sector 111',
      'sector-11a': 'Sector 11A',
      'sector-12': 'Sector 12',
      'sector-12a': 'Sector 12A',
      'sector-13': 'Sector 13',
      'sector-14': 'Sector 14',
      'sector-15-i': 'Sector 15-I',
      'sector-15-ii': 'Sector 15-II',
      'sector-16': 'Sector 16',
      'sector-17': 'Sector 17',
      'sector-18': 'Sector 18',
      'sector-19': 'Sector 19',
      'sector-2': 'Sector 2',
      'sector-20': 'Sector 20',
      'sector-21': 'Sector 21',
      'sector-22': 'Sector 22',
      'sector-23': 'Sector 23',
      'sector-23a': 'Sector 23A',
      'sector-24': 'Sector 24',
      'sector-25': 'Sector 25',
      'sector-25a': 'Sector 25A',
      'sector-26': 'Sector 26',
      'sector-26a': 'Sector 26A',
      'sector-27': 'Sector 27',
      'sector-28': 'Sector 28',
      'sector-29': 'Sector 29',
      'sector-3': 'Sector 3',
      'sector-30': 'Sector 30',
      'sector-31': 'Sector 31',
      'sector-32': 'Sector 32',
      'sector-33': 'Sector 33',
      'sector-34': 'Sector 34',
      'sector-35': 'Sector 35',
      'sector-36': 'Sector 36',
      'sector-36a': 'Sector 36A',
      'sector-36b': 'Sector 36B',
      'sector-37': 'Sector 37',
      'sector-37a': 'Sector 37A',
      'sector-37b': 'Sector 37B',
      'sector-37c': 'Sector 37C',
      'sector-37d': 'Sector 37D',
      'sector-38': 'Sector 38',
      'sector-39': 'Sector 39',
      'sector-3a': 'Sector 3A',
      'sector-4': 'Sector 4',
      'sector-40': 'Sector 40',
      'sector-41': 'Sector 41',
      'sector-42': 'Sector 42',
      'sector-43': 'Sector 43',
      'sector-44': 'Sector 44',
      'sector-45': 'Sector 45',
      'sector-46': 'Sector 46',
      'sector-47': 'Sector 47',
      'sector-48': 'Sector 48',
      'sector-49': 'Sector 49',
      'sector-5': 'Sector 5',
      'sector-50': 'Sector 50',
      'sector-51': 'Sector 51',
      'sector-52': 'Sector 52',
      'sector-52a': 'Sector 52A',
      'sector-53': 'Sector 53',
      'sector-54': 'Sector 54',
      'sector-55': 'Sector 55',
      'sector-56': 'Sector 56',
      'sector-57': 'Sector 57',
      'sector-58': 'Sector 58',
      'sector-59': 'Sector 59',
      'sector-6': 'Sector 6',
      'sector-61': 'Sector 61',
      'sector-62': 'Sector 62',
      'sector-65': 'Sector 65',
      'sector-71': 'Sector 71',
      'sector-72': 'Sector 72',
      'sector-72a': 'Sector 72A',
      'sector-73': 'Sector 73',
      'sector-74': 'Sector 74',
      'sector-74a': 'Sector 74A',
      'sector-75a': 'Sector 75A',
      'sector-8': 'Sector 8',
      'sector-84': 'Sector 84',
      'sector-85': 'Sector 85',
      'sector-88': 'Sector 88',
      'sector-88a': 'Sector 88A',
      'sector-88b': 'Sector 88B',
      'sector-9': 'Sector 9',
      'sector-99': 'Sector 99',
      'sector-99a': 'Sector 99A',
      'sector-9a': 'Sector 9A',
      'sector-9b': 'Sector 9B',
      'seelampur': 'Seelampur',
      'shahdara': 'Shahdara',
      'shaheen-bagh': 'Shaheen Bagh',
      'shahpur-jat': 'Shahpur Jat',
      'shakarpur': 'Shakarpur',
      'shalimar-bagh': 'Shalimar Bagh',
      'shivaji-nagar': 'Shivaji Nagar',
      'shyam-vihar': 'Shyam Vihar',
      'south-dwarka': 'South Dwarka',
      'south-extension': 'South Extension',
      'sultanpuri': 'Sultanpuri',
      'surajkund': 'Surajkund',
      'surya-nagar': 'Surya Nagar',
      'tilak-nagar': 'Tilak Nagar',
      'trilok-puri': 'Trilok Puri',
      'tughlakabad': 'Tughlakabad',
      'uttam-nagar': 'Uttam Nagar',
      'vaishali': 'Vaishali',
      'vasant-kunj': 'Vasant Kunj',
      'vasant-vihar': 'Vasant Vihar',
      'vasundhara': 'Vasundhara',
      'vikaspuri': 'Vikaspuri',
      'vivek-vihar': 'Vivek Vihar',
      'wazirabad': 'Wazirabad',
      'yamuna-vihar': 'Yamuna Vihar'
    }
  };

  /* ---------- the air ----------

     The judgement this whole pack turns on, and it is not the obvious
     one.

     The obvious build is a gate: above some number, stop suggesting
     anything outdoors. It reads as responsible and it is useless.
     Delhi has six to eight weeks a year like this and life does not
     pause for them — people still have Sundays, children still have
     birthdays, and somebody who lives here has already seen the number
     on their phone. **Nobody is choosing between Lodhi Garden and clean
     air. They are choosing between Lodhi Garden and the sofa.** A guide
     that empties itself out has removed the only thing it was for.

     So: say the number plainly at the top, tilt the ranking, and leave
     everything standing. The weights below are large enough to reorder
     a page and never large enough to clear one — an outdoor place on a
     hazardous day sits below the indoor ones and is still there.

     For scale: `weatherFit` gives an outdoor place -12 in the rain,
     which is the strongest push the engine has ever applied and still
     does not remove anything. Severe air is -14. Hazardous is -18, and
     an indoor place gets +8 rather than the outdoor one getting -30,
     because lifting one list is gentler than burying the other.

     The genuinely useful part is not the penalty at all — it is the
     hour. Air here is far worse at nine in the evening than at seven in
     the morning, and js/air.js reads the hourly forecast and says so.
     That is advice a local would give. "Do not go outside" is not. */

  const air = {
    watch: true,
    weight: {
      clean:     { outdoor:  4, indoor: -1 },
      moderate:  { outdoor:  1, indoor:  0 },
      poor:      { outdoor: -4, indoor:  3 },
      bad:       { outdoor: -9, indoor:  5 },
      severe:    { outdoor: -14, indoor: 8 },
      hazardous: { outdoor: -18, indoor: 8 }
    }
  };

  /* ---------- the year ----------

     Delhi's calendar is not flat with events sprinkled on it. It is five
     regimes, and which one you are in decides more than the weather does
     in Paris. Stated rather than used for now: nothing reads this yet,
     and inventing a consumer for it before the curated tier exists would
     be building the shelf before the books. */

  const seasons = [
    { from: '11-01', to: '02-15', name: 'the good months',
      note: 'The reason people put up with the rest of it. Everything outdoors is on.' },
    { from: '02-16', to: '03-31', name: 'spring',
      note: 'Short, warm, and the gardens are at their best.' },
    { from: '04-01', to: '06-20', name: 'the heat',
      note: 'Forty-plus by noon. Mornings and evenings only, and indoors in between.' },
    { from: '06-21', to: '09-30', name: 'the monsoon',
      note: 'Cooler, greener, and the streets flood. Plans keep but travel does not.' },
    { from: '10-01', to: '10-31', name: 'after the rain',
      note: 'The brief window between the monsoon and the smog.' }
  ];

  /* ---------- how long a kilometre takes ----------

     Worse than Bengaluru and for different reasons: the city is much
     larger, the Metro is genuinely good and covers a lot of it, and the
     roads are unusable twice a day. So the Metro is the fast option here
     rather than the awkward one, and the road model is the pessimistic
     fallback it deserves to be.

     The rush windows are wider than Bengaluru's, because they are. */

  const RUSH = [[8.5, 11.5], [17, 21]];

  const reach = {
    rush: RUSH,
    isPeak(when) {
      const day = when.getDay();
      if (day === 0) return false;
      const h = when.getHours() + when.getMinutes() / 60;
      return RUSH.some(([a, b]) => h >= a && h < b);
    },
    minutes(d, when) {
      const walk  = d < 2 ? d / 4.5 * 60 : Infinity;
      const metro = 8 + (d / 26) * 60 + 7;
      const road  = 5 + (d / (this.isPeak(when) ? 13 : 25)) * 60;
      return Math.max(2, Math.round(Math.min(walk, metro, road)));
    },
    sector: 70
  };

  /* India Gate, which is what the city is measured from. */
  const centre = [28.6129, 77.2295];

  /* ---------- when the city is shut ----------

     INCOMPLETE, DELIBERATELY, and the same caveat as Bengaluru. The
     fixed days are safe. Diwali, Holi, Eid, Dussehra and Guru Nanak
     Jayanti all move against the Gregorian calendar and a guessed date
     would put a wrong closure on a real shop.

     Worth noting that the Paris assumption does not transfer at all
     here: a French holiday shuts bakeries and opens museums. Diwali
     shuts most of Delhi for two days; Holi shuts it for one and makes
     going outside a different proposition entirely. */

  const holidays = {
    '2026-10-02': 'Gandhi Jayanti',
    '2026-12-25': 'Christmas Day',
    '2027-01-26': 'Republic Day',
    '2027-08-15': 'Independence Day'
  };

  const shutsOnHoliday = ['bakery', 'cafe', 'shop', 'market'];

  const money = { symbol: '₹', cheap: 600, format: n => `₹${n}` };

  const views = {
    main: [
      { id: 'today',    label: 'Today' },
      { id: 'nights',   label: 'Nights' },
      { id: 'weekend',  label: 'Weekend' },
      { id: 'eat',      label: 'Eat' },
      { id: 'sport',    label: 'Sport' },
      { id: 'regulars', label: 'Regulars' },
      { id: 'explore',  label: 'Explore' },
      { id: 'away',     label: 'Away' }
    ],
    utility: [
      { id: 'quests', label: 'Quests' },
      { id: 'saved',  label: 'Saved' }
    ]
  };

  /* GK-1, rounded. Air and weather are both asked for at this point. */
  const weather = { lat: 28.55, lon: 77.24, tz: 'Asia/Kolkata' };

  /* Delhi plus NCR, which is the unit people actually live in. The
     first box stopped at 77.40 east and 28.75 north, which cut off
     Greater Noida, Ghaziabad and the far half of Faridabad — three
     places a great many Delhi lives happen in. */
  const bbox = '28.28,76.82,28.92,77.62';

  /* Same reasoning as Bengaluru: a worker's scope is its own directory,
     and sw.js deserves splitting rather than copying. */
  const serviceWorker = false;

  /* ---------- what counts as notable here ----------

     Extra Wikidata classes for scripts/notable.mjs, on top of the cafés
     and bookshops it asks about everywhere. The base list is what
     Wikidata knows about a European city; asked about Delhi it found
     eighty-one records in a city of twenty million.

     What Delhi has instead, counted in its own bounding box: 59 tombs,
     41 mosques, 34 parks, 17 gurdwaras, 15 Hindu temples. Humayun's
     Tomb and the Jama Masjid are not a footnote to the list of things
     worth seeing here — they are most of it, and the list simply never
     asked. */
  const notable = {
    classes: [
      ['wd:Q381885',  'culture'],   // tomb
      ['wd:Q32815',   'culture'],   // mosque
      ['wd:Q842402',  'culture'],   // Hindu temple
      ['wd:Q337986',  'culture'],   // gurdwara
      ['wd:Q16970',   'culture'],   // church building
      ['wd:Q4989906', 'culture'],   // monument
      ['wd:Q839954',  'culture'],   // archaeological site
      ['wd:Q1473950', 'culture'],   // stepwell — Agrasen ki Baoli and its kind
      ['wd:Q57821',   'culture'],   // fortification
      ['wd:Q16560',   'culture'],   // palace
      ['wd:Q22746',   'park'],      // urban park
      ['wd:Q1107656', 'park']       // garden
    ]
  };

  /* ---------- Luma ----------

     Sixteen events on a rolling fortnight, all sixteen geocoded and all
     sixteen inside the box — and only three of them tech. Delhi's
     calendar is morning runs, social nights and food. That is the
     opposite of what the Paris keyword gate was tuned for, which is why
     the non-tech half matters more here than anywhere.

     Read by two scripts, split by one rule: practices.mjs takes the tech
     and AI evenings, events-city.mjs takes the rest. LUMA_TECH in
     scripts/ics.mjs is that rule, and it lives in one place so an
     evening cannot land in both files or neither. */
  const luma = [['discover', 'discplace-CzipmKodUYN2Dfx', 'Luma — Delhi']];

  /* Luma only — no municipal feed here carries what you could take up. */
  const practices = { city: null };

  /* ---------- what else this city is made of ----------

     Extra OpenStreetMap layers for scripts/discover.mjs, on top of the
     cafés and bakeries it looks for everywhere. See the note above
     LAYERS in that file for the counts that prompted these. */
  const discover = {
    layers: [
      { cat:'culture',    emoji:'🏛️', label:'Historic',    q:['way["historic"]["name"]','node["historic"]["name"]'] },
      { cat:'park',       emoji:'💧', label:'Water',       q:['way["natural"="water"]["name"]'], minName:true },
      { cat:'restaurant', emoji:'🍛', label:'Counter food', q:['node["amenity"="fast_food"]["name"]','node["amenity"="food_court"]["name"]'] }
    ]
  };

  return { id, name, ua, bbox, serviceWorker, zone, air, seasons, reach, notable, luma, practices, discover,
           centre, views, holidays, shutsOnHoliday, money, weather };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = City;
