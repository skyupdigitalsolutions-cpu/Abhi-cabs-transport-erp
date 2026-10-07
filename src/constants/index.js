/**
 * Cities and towns offered for each state in the rate-card form.
 *
 * Picking a state lists everything here PLUS any city already saved on the
 * server. Choosing one that is not saved yet creates it (POST /admin/cities —
 * the backend geocodes the name and derives the service radius) at the moment
 * the rate card is saved, so nobody has to "add a city" as a separate step.
 *
 * Names are what a maps provider recognises. Karnataka, Telangana, Andhra
 * Pradesh and Maharashtra — the states the fleet operates in — list every
 * district headquarters plus common outstation towns; the others list the
 * main cities and tourist towns. A place missing here can still be added with
 * the "City not listed?" link on the form.
 */
export const STATE_CITIES = {
  'Karnataka': [
    'Bengaluru', 'Mysuru', 'Mangaluru', 'Hubballi', 'Dharwad', 'Belagavi', 'Kalaburagi', 'Ballari',
    'Vijayapura', 'Shivamogga', 'Tumakuru', 'Davangere', 'Hassan', 'Udupi', 'Chikkamagaluru',
    'Madikeri', 'Mandya', 'Chitradurga', 'Raichur', 'Bidar', 'Koppal', 'Gadag', 'Haveri', 'Karwar',
    'Chamarajanagar', 'Chikkaballapur', 'Kolar', 'Ramanagara', 'Yadgir', 'Bagalkot', 'Hosapete',
    'Sirsi', 'Gokarna', 'Bhadravati', 'Dandeli', 'Hampi', 'Sakleshpur', 'Kushalnagar',
  ],
  'Telangana': [
    'Hyderabad', 'Secunderabad', 'Warangal', 'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda',
    'Mahabubnagar', 'Adilabad', 'Medak', 'Sangareddy', 'Siddipet', 'Suryapet', 'Vikarabad',
    'Kamareddy', 'Jagtial', 'Peddapalli', 'Mancherial', 'Nirmal', 'Kothagudem', 'Wanaparthy',
    'Nagarkurnool', 'Jangaon', 'Mahabubabad', 'Gadwal', 'Bhongir', 'Ramagundam', 'Sircilla',
    'Shamshabad', 'Zaheerabad', 'Tandur', 'Bodhan', 'Miryalaguda',
  ],
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Tirupati', 'Kurnool', 'Kakinada',
    'Rajahmundry', 'Kadapa', 'Anantapur', 'Eluru', 'Ongole', 'Chittoor', 'Machilipatnam',
    'Srikakulam', 'Vizianagaram', 'Amaravati', 'Tenali', 'Nandyal', 'Puttaparthi', 'Hindupur',
    'Proddatur', 'Bhimavaram', 'Tadepalligudem', 'Madanapalle', 'Dharmavaram', 'Narasaraopet',
    'Chilakaluripet', 'Palakollu', 'Amalapuram', 'Anakapalle', 'Bapatla', 'Srikalahasti', 'Tuni',
  ],
  'Maharashtra': [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Amravati', 'Thane',
    'Navi Mumbai', 'Kalyan', 'Vasai-Virar', 'Sangli', 'Satara', 'Latur', 'Nanded', 'Jalgaon', 'Akola',
    'Dhule', 'Ahmednagar', 'Ratnagiri', 'Chandrapur', 'Yavatmal', 'Parbhani', 'Beed', 'Osmanabad',
    'Wardha', 'Buldhana', 'Gondia', 'Bhandara', 'Gadchiroli', 'Hingoli', 'Jalna', 'Nandurbar', 'Washim',
    'Sindhudurg', 'Lonavala', 'Mahabaleshwar', 'Shirdi', 'Panvel', 'Pimpri-Chinchwad', 'Malegaon',
    'Ichalkaranji', 'Alibag',
  ],
  'Tamil Nadu': [
    'Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore',
    'Thoothukudi', 'Hosur', 'Thanjavur', 'Dindigul', 'Kanchipuram', 'Kanyakumari', 'Nagercoil', 'Ooty',
    'Kodaikanal', 'Karur', 'Tiruppur', 'Cuddalore', 'Krishnagiri', 'Namakkal', 'Rameswaram',
  ],
  'Kerala': [
    'Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha', 'Kottayam',
    'Palakkad', 'Malappuram', 'Kasaragod', 'Pathanamthitta', 'Idukki', 'Kalpetta', 'Munnar',
  ],
  'Goa': ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  'Gujarat': [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Junagadh',
    'Anand', 'Bharuch', 'Vapi', 'Mehsana', 'Bhuj', 'Porbandar', 'Dwarka',
  ],
  'Rajasthan': [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Jaisalmer', 'Alwar', 'Bharatpur',
    'Pushkar', 'Mount Abu', 'Chittorgarh', 'Sikar', 'Bhilwara',
  ],
  'Madhya Pradesh': [
    'Bhopal', 'Indore', 'Gwalior', 'Jabalpur', 'Ujjain', 'Sagar', 'Rewa', 'Satna', 'Ratlam',
    'Khajuraho', 'Chhindwara',
  ],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Prayagraj', 'Ghaziabad', 'Noida', 'Meerut', 'Bareilly',
    'Aligarh', 'Moradabad', 'Gorakhpur', 'Mathura', 'Jhansi', 'Ayodhya', 'Saharanpur', 'Firozabad',
  ],
  'Delhi': ['New Delhi'],
  'Haryana': [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Karnal', 'Hisar', 'Rohtak', 'Sonipat',
    'Kurukshetra', 'Panchkula',
  ],
  'Punjab': ['Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur'],
  'Himachal Pradesh': ['Shimla', 'Manali', 'Dharamshala', 'Kullu', 'Solan', 'Mandi', 'Kasauli'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Rishikesh', 'Nainital', 'Haldwani', 'Roorkee', 'Mussoorie', 'Almora'],
  'Jammu & Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Katra', 'Gulmarg', 'Pahalgam'],
  'Ladakh': ['Leh', 'Kargil'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Arrah', 'Bihar Sharif'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'West Bengal': ['Kolkata', 'Howrah', 'Siliguri', 'Durgapur', 'Asansol', 'Darjeeling', 'Kharagpur', 'Digha'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Puri', 'Rourkela', 'Sambalpur', 'Berhampur', 'Balasore'],
  'Chhattisgarh': ['Raipur', 'Bilaspur', 'Bhilai', 'Durg', 'Korba', 'Jagdalpur'],
  'Assam': ['Guwahati', 'Dibrugarh', 'Silchar', 'Jorhat', 'Tezpur'],
  'Arunachal Pradesh': ['Itanagar'],
  'Manipur': ['Imphal'],
  'Meghalaya': ['Shillong'],
  'Mizoram': ['Aizawl'],
  'Nagaland': ['Kohima', 'Dimapur'],
  'Sikkim': ['Gangtok'],
  'Tripura': ['Agartala'],
  'Puducherry': ['Puducherry', 'Karaikal'],
};

/** Case-insensitive name key, for matching saved cities against this list. */
export const cityKey = (name) => String(name || '').trim().toLowerCase();