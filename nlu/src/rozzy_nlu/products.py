"""Product catalogue used by the data generator.

PRODUCTS: canonical_name -> (roman Urdu spellings, allowed units)
PA_EXTRA: canonical_name -> extra Roman Punjabi spellings

NOTE: Punjabi spellings are a STARTER list written by Claude. They MUST be reviewed by a
native Pakistani Punjabi speaker (see docs/NLU.md, "Known limits").
To add a product: add it to PRODUCTS (and PA_EXTRA if the Punjabi word differs), add its unit
rules in data_gen.unit_choices(), then regenerate the data and retrain.
"""

PRODUCTS = {'ata': (['ata', 'aata', 'atta'], ['kg']),
 'maida': (['maida', 'meda'], ['kg']),
 'chawal': (['chawal', 'chaval'], ['kg']),
 'cheeni': (['cheeni', 'chini', 'cheni'], ['kg']),
 'namak': (['namak', 'namuk'], ['kg', 'packet']),
 'lal_mirch': (['lal mirch', 'mirch'], ['kg']),
 'haldi': (['haldi', 'haldee'], ['kg']),
 'dhania': (['dhania', 'dhaniya'], ['kg']),
 'zeera': (['zeera', 'jeera'], ['kg']),
 'daal_chana': (['daal chana', 'chana daal'], ['kg']),
 'daal_masoor': (['daal masoor', 'masoor daal'], ['kg']),
 'daal_mash': (['daal mash', 'mash daal'], ['kg']),
 'chanay': (['chanay', 'chane'], ['kg']),
 'lobia': (['lobia', 'lobiya'], ['kg']),
 'doodh': (['doodh', 'dudh'], ['L', 'packet']),
 'dahi': (['dahi', 'dahee'], ['kg']),
 'makhan': (['makhan', 'makkhan'], ['kg', 'packet']),
 'ghee': (['ghee', 'desi ghee'], ['kg', 'packet']),
 'tel': (['tel', 'oil', 'cooking oil'], ['L', 'packet']),
 'anday': (['anday', 'ande'], ['dozen']),
 'chai': (['chai patti', 'chai'], ['kg', 'packet']),
 'sabun': (['sabun', 'soap'], ['piece']),
 'surf': (['surf', 'washing powder'], ['kg', 'packet']),
 'biscuit': (['biscuit', 'biscut'], ['packet']),
 'noodles': (['noodles', 'nudles'], ['packet']),
 'aloo': (['aloo', 'alu'], ['kg']),
 'pyaz': (['pyaz', 'pyaaz'], ['kg']),
 'tamatar': (['tamatar', 'tamater'], ['kg']),
 'lehsan': (['lehsan', 'lehsun'], ['kg']),
 'adrak': (['adrak', 'adrakh'], ['kg']),
 'kela': (['kela', 'kaila'], ['dozen']),
 'seb': (['seb', 'saib'], ['kg']),
 'gur': (['gur', 'gurr'], ['kg']),
 'khajoor': (['khajoor', 'khajur'], ['kg']),
 'badam': (['badam', 'badaam'], ['kg']),
 'bread': (['double roti', 'bread'], ['piece']),
 'cold_drink': (['cold drink', 'coke'], ['L', 'piece']),
 'machis': (['machis', 'maachis'], ['packet', 'piece']),
 'mombatti': (['mombatti', 'mombati'], ['dozen', 'packet'])}

PA_EXTRA = {'cheeni': ['khand', 'khaand', 'chini'],
 'chawal': ['chaul', 'chawal'],
 'doodh': ['dudh', 'dhud', 'dhudh'],
 'pyaz': ['piyaz', 'pyaz', 'gandhe'],
 'lehsan': ['lasan', 'lehsan'],
 'anday': ['ande', 'auday'],
 'lal_mirch': ['mirchan', 'lal mirch'],
 'kela': ['kele', 'kela'],
 'chanay': ['channe', 'chanay'],
 'tamatar': ['tamatar', 'timatar'],
 'aloo': ['aloo', 'alu', 'aaloo'],
 'dahi': ['dahi', 'dahin'],
 'namak': ['loon', 'noon'],
 'ghee': ['ghiu', 'ghee'],
 'chai': ['chah patti', 'chah'],
 'gur': ['gudd', 'gur'],
 'seb': ['seb']}
