from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.backends import default_backend
import base64
import os

def generate_key_pair(key_filename_prefix, key_size=2048):
    """
    Generate RSA key pair and save to files
    Returns: (private_key_path, public_key_path)
    """
    # Generate keys
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=key_size,
        backend=default_backend()
    )
    public_key = private_key.public_key()

    # Create filenames
    priv_path = f"keys\\{key_filename_prefix}-prv.pem"
    pub_path = f"keys\\{key_filename_prefix}-pub.pem"

    # Save private key
    with open(priv_path, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))

    # Save public key
    with open(pub_path, "wb") as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ))

    return priv_path, pub_path


def encrypt_message(message, public_key_path, output_file=None):
    """Encrypt string message (convenience wrapper around encrypt_file)"""
    with open(public_key_path, "rb") as f:
        public_key = serialization.load_pem_public_key(
            f.read(),
            backend=default_backend()
        )

    encrypted = public_key.encrypt(
        message.encode(),
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    )
    encrypted_b64 = base64.b64encode(encrypted)

    if output_file:
        with open("keys\\encrypted\\" + output_file, "wb") as f:
            f.write(encrypted_b64)

    return encrypted_b64.decode()

def decrypt_message(encrypted_b64, private_key_path):
    """Decrypt base64 message (convenience wrapper around decrypt_file)"""
    with open(private_key_path, "rb") as f:
        private_key = serialization.load_pem_private_key(
            f.read(),
            password=None,
            backend=default_backend()
        )

    encrypted = base64.b64decode(encrypted_b64)
    return private_key.decrypt(
        encrypted,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None
        )
    ).decode()
    
def main():
    client = input("Client: ")
    numc = input("NUMC: ")
    email = input("Email: ")
    access = input("Accessing: ")
    priv, pub = generate_key_pair(client.lower())
    encrypt_message(f"auth:{client}{numc}{email}|stat:{access}rsaOK", pub, f"{client.lower()}-msg.enc")

if __name__ == "__main__":
     main()