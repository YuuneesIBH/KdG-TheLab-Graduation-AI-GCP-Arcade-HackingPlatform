package main;
public class Camera {
    private Coordinate3D position;
    private float distanceToPlane;
    private float distanceToPlayer;

    public Camera() {
        position = new Coordinate3D(0, 1200, -1000);
        distanceToPlayer = -position.z;
        distanceToPlane = distanceToPlayer / position.y;
    }
    public void increase(int dz) {
        position.z += dz;
    }
    public void increasX(int dx) {
        position.x += dx;
    }
    
    public void updateHeight(float y) {
        float dy = y - position.y;
        position.y = y;
        float dz = (position.y * distanceToPlayer) / (position.y - dy) - distanceToPlayer;
        updateDepth(dz);
    }
    
    public void updateFieldOfView(float z) {
        float previousHeight = position.y;
        updateHeight(1200);
        float dz = z - distanceToPlayer;
        position.z -= dz;
        distanceToPlayer += dz;
        distanceToPlane = distanceToPlayer / position.y;
        updateHeight(previousHeight);
    }
    
    public void updateDistanceToPlayer(float z) {
        float dz = z - distanceToPlayer;
        position.z -= dz;
        distanceToPlayer += dz;
    }
    
    private void updateDepth(float dz) {
        distanceToPlayer += dz;
        position.z -=dz;
    }
    
    public void update(Coordinate3D playerPosition) {
        position.x = playerPosition.x;
        position.z = playerPosition.z - distanceToPlayer;

    }
    
    public void restart() {
        position.z = -distanceToPlayer;
    }
    public Coordinate3D getPosition() {
        return position;
    }

    public void setPosition(Coordinate3D coordinate3D) {
        this.position = coordinate3D;
    }

    public float getDistanceToPlane() {
        return distanceToPlane;
    }

    public void setDistanceToPlane(float distanceToPlane) {
        this.distanceToPlane = distanceToPlane;
    }
    
     public float getDistanceToPlayer() {
        return distanceToPlayer;
    }

    public void setDistanceToPlayer(int distanceToPlayer) {
        this.distanceToPlayer = distanceToPlayer;
    }
}
