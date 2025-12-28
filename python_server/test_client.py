import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print("Connected to server!")

@sio.event
def connect_error(data):
    print("Connection failed!", data)

@sio.event
def disconnect():
    print("Disconnected from server")

@sio.event
def image(data):
    print(f"Received image! Length: {len(data)}")
    # Just print one and exit or loop a few times
    sio.disconnect()

def test_streaming():
    try:
        sio.connect('http://localhost:3000')
        # Wait a bit for an image
        time.sleep(5)
        if sio.connected:
             print("Still connected, but maybe no image received yet if 'image' event didn't fire.")
             sio.disconnect()
    except Exception as e:
        print(f"Test failed: {e}")

if __name__ == '__main__':
    test_streaming()



