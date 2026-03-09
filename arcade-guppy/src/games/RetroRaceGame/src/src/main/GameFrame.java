package main;

import Gui.StartMenuPanel;
import java.awt.CardLayout;
import java.awt.Dimension;
import java.awt.GraphicsDevice;
import java.awt.GraphicsEnvironment;
import java.awt.Point;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.swing.JFrame;
import javax.swing.JPanel;
public class GameFrame extends JFrame{
    private static final int SCREEN_WIDTH = 1024;
    private static final int SCREEN_HEIGHT = 768;
    private static final Pattern POS_PATTERN = Pattern.compile("^\\s*(-?\\d+)\\s*,\\s*(-?\\d+)\\s*$");
    private static final Pattern SIZE_PATTERN = Pattern.compile("^\\s*(\\d+)\\s*x\\s*(\\d+)\\s*$");
    private final JPanel cards;
    private final LaunchConfig launchConfig;

    public GameFrame() {
        launchConfig = LaunchConfig.fromEnvironment();
        setPreferredSize(new Dimension(launchConfig.width, launchConfig.height));
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setTitle("Race game");
        setResizable(false);
        if (launchConfig.arcadeLaunch) {
            setUndecorated(true);
        }
        StartMenuPanel startMenuPanel = new StartMenuPanel(this);
        cards = new JPanel(new CardLayout());
        cards.add(startMenuPanel, "menu");        
        this.add(cards);
        pack();
    }
    
    public void startGame(GamePanel gamePanel) {
        cards.add(gamePanel, "game");
        CardLayout cl = (CardLayout) cards.getLayout();
        cl.show(cards, "game");
        gamePanel.pauseOrResume();
        gamePanel.requestFocusInWindow();
    }
    public void goToMenu(GamePanel gamePanel) {
        CardLayout cl = (CardLayout) cards.getLayout();
        cl.show(cards, "menu");
        cards.remove(gamePanel);
    }

    private void applyLaunchBounds() {
        if (launchConfig.hasPosition) {
            setLocation(launchConfig.x, launchConfig.y);
            return;
        }
        setLocationRelativeTo(null);
    }

    private void applyFullscreenIfNeeded() {
        if (!launchConfig.fullscreen) return;
        GraphicsDevice device = GraphicsEnvironment.getLocalGraphicsEnvironment().getDefaultScreenDevice();
        if (device.isFullScreenSupported()) {
            device.setFullScreenWindow(this);
            return;
        }
        setExtendedState(JFrame.MAXIMIZED_BOTH);
    }

    private static Point parseWindowPosition(String rawValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) return null;
        Matcher matcher = POS_PATTERN.matcher(rawValue);
        if (!matcher.matches()) return null;
        try {
            int x = Integer.parseInt(matcher.group(1));
            int y = Integer.parseInt(matcher.group(2));
            return new Point(x, y);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private static Dimension parseWindowSize(String rawValue) {
        if (rawValue == null || rawValue.trim().isEmpty()) {
            return new Dimension(SCREEN_WIDTH, SCREEN_HEIGHT);
        }
        Matcher matcher = SIZE_PATTERN.matcher(rawValue);
        if (!matcher.matches()) {
            return new Dimension(SCREEN_WIDTH, SCREEN_HEIGHT);
        }
        try {
            int width = Integer.parseInt(matcher.group(1));
            int height = Integer.parseInt(matcher.group(2));
            if (width <= 0 || height <= 0) {
                return new Dimension(SCREEN_WIDTH, SCREEN_HEIGHT);
            }
            return new Dimension(width, height);
        } catch (NumberFormatException ignored) {
            return new Dimension(SCREEN_WIDTH, SCREEN_HEIGHT);
        }
    }

    private static boolean parseBoolean(String rawValue) {
        if (rawValue == null) return false;
        String value = rawValue.trim();
        return "1".equals(value) || "true".equalsIgnoreCase(value) || "yes".equalsIgnoreCase(value);
    }

    private static class LaunchConfig {
        final boolean arcadeLaunch;
        final boolean fullscreen;
        final boolean hasPosition;
        final int x;
        final int y;
        final int width;
        final int height;

        private LaunchConfig(boolean arcadeLaunch, boolean fullscreen, Point position, Dimension size) {
            this.arcadeLaunch = arcadeLaunch;
            this.fullscreen = fullscreen;
            this.hasPosition = position != null;
            this.x = position != null ? position.x : 0;
            this.y = position != null ? position.y : 0;
            this.width = size.width;
            this.height = size.height;
        }

        static LaunchConfig fromEnvironment() {
            String embeddedRaw = System.getenv("ARCADE_EMBEDDED");
            String positionRaw = System.getenv("ARCADE_WINDOW_POS");
            String sizeRaw = System.getenv("ARCADE_WINDOW_SIZE");

            boolean embedded = parseBoolean(embeddedRaw);
            boolean arcadeLaunch = embeddedRaw != null || positionRaw != null || sizeRaw != null;
            boolean fullscreen = arcadeLaunch && !embedded;

            Point position = parseWindowPosition(positionRaw);
            Dimension size = parseWindowSize(sizeRaw);
            return new LaunchConfig(arcadeLaunch, fullscreen, position, size);
        }
    }
    
    
    public static void main(String[] args) {
        GameFrame mf = new GameFrame();
        mf.applyLaunchBounds();
        mf.setVisible(true);
        mf.applyFullscreenIfNeeded();
    }
}
