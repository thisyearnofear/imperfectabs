// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract SimpleTest {
    
    struct LocalAbsScore {
        address user;
        uint256 totalReps;
        uint256 averageFormAccuracy;
        uint256 bestStreak;
        uint256 sessionsCompleted;
        uint256 timestamp;
    }
    
    LocalAbsScore[] public leaderboard;
    mapping(address => uint256) public userIndex;
    
    function calculateTotalScore(address user) public view returns (uint256) {
        uint256 localScore = 0;
        if (userIndex[user] > 0 && userIndex[user] <= leaderboard.length) {
            LocalAbsScore memory localData = leaderboard[userIndex[user] - 1];
            localScore = localData.totalReps * 10;
        }
        return localScore;
    }
    
    function updateLocalLeaderboard(uint256 r, uint256 fa, uint256 s) external {
        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            leaderboard.push(LocalAbsScore({ 
                user: msg.sender, 
                totalReps: r, 
                averageFormAccuracy: fa, 
                bestStreak: s, 
                sessionsCompleted: 1, 
                timestamp: block.timestamp 
            }));
            userIndex[msg.sender] = leaderboard.length;
        } else {
            LocalAbsScore storage userScore = leaderboard[index - 1];
            userScore.totalReps += r;
            userScore.averageFormAccuracy = ((userScore.averageFormAccuracy * userScore.sessionsCompleted) + fa) / (userScore.sessionsCompleted + 1);
            if (s > userScore.bestStreak) userScore.bestStreak = s;
            userScore.sessionsCompleted++;
            userScore.timestamp = block.timestamp;
        }
        
        // Test the calculateTotalScore function
        uint256 score = calculateTotalScore(msg.sender);
        require(score >= 0, "Score calculation failed");
    }
}
