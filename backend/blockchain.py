import hashlib
import json
from datetime import datetime

class CustomBlockchain:
    """Custom blockchain implementation for demonstration"""
    
    def __init__(self):
        self.chain = []
        self.create_genesis_block()
    
    def create_genesis_block(self):
        """Create the first block in the chain"""
        genesis_block = {
            'index': 0,
            'timestamp': datetime.now().isoformat(),
            'data': {
                'type': 'GENESIS',
                'message': 'Insurance Fraud Detection System Initialized'
            },
            'previous_hash': '0',
            'hash': ''
        }
        genesis_block['hash'] = self.calculate_hash(genesis_block)
        self.chain.append(genesis_block)
    
    def calculate_hash(self, block):
        """Calculate SHA-256 hash of a block"""
        block_string = json.dumps({
            'index': block['index'],
            'timestamp': block['timestamp'],
            'data': block['data'],
            'previous_hash': block['previous_hash']
        }, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def get_latest_block(self):
        """Get the most recent block"""
        return self.chain[-1]
    
    def add_block(self, data):
        """Add a new block to the chain"""
        previous_block = self.get_latest_block()
        new_block = {
            'index': len(self.chain),
            'timestamp': datetime.now().isoformat(),
            'data': data,
            'previous_hash': previous_block['hash'],
            'hash': ''
        }
        new_block['hash'] = self.calculate_hash(new_block)
        self.chain.append(new_block)
        return new_block
    
    def is_chain_valid(self):
        """Validate the entire blockchain"""
        for i in range(1, len(self.chain)):
            current_block = self.chain[i]
            previous_block = self.chain[i - 1]
            
            # Verify current block's hash
            if current_block['hash'] != self.calculate_hash(current_block):
                return False
            
            # Verify link to previous block
            if current_block['previous_hash'] != previous_block['hash']:
                return False
        
        return True
    
    def get_blocks_by_type(self, block_type):
        """Get all blocks of a specific type"""
        return [block for block in self.chain if block['data'].get('type') == block_type]
    
    def get_block_by_index(self, index):
        """Get a specific block by index"""
        if 0 <= index < len(self.chain):
            return self.chain[index]
        return None